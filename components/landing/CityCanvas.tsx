"use client";

import { useEffect, useRef } from "react";

interface CityCanvasProps {
  /** bg colour the canvas fades into on all edges – must be an opaque hex/rgb */
  fadeColor?: string;
  /** "dark" gives night city; "light" gives day city */
  theme?: "light" | "dark";
}

export default function CityCanvas({
  fadeColor = "#0D2020",
  theme = "dark",
}: CityCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const propsRef  = useRef({ fadeColor, theme });

  // Keep props ref fresh without restarting the animation loop
  useEffect(() => {
    propsRef.current = { fadeColor, theme };
  }, [fadeColor, theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    let W = canvas.width  = canvas.offsetWidth;
    let H = canvas.height = canvas.offsetHeight;

    // ── Isometric projection ──────────────────────────────────────────
    // Offset grid toward the right half of the canvas
    const TILE = 44;
    function isoProject(gx: number, gy: number, gz = 0): [number, number] {
      const cx = W * 0.62; // shift grid center to right side
      const cy = H * 0.30;
      const sx = (gx - gy) * (TILE * 0.6) + cx;
      const sy = (gx + gy) * (TILE * 0.3) - gz * (TILE * 0.55) + cy;
      return [sx, sy];
    }

    // ── City grid ─────────────────────────────────────────────────────
    const GRID = 11;

    // Deterministic pseudo-random so grid is stable across frames
    function seededRand(seed: number) {
      const x = Math.sin(seed + 1) * 10000;
      return x - Math.floor(x);
    }

    type Cell = { type: "road" | "block"; h: number; baseColor: string };
    const DARK_COLORS  = ["#1a3535", "#0f2828", "#163030", "#0d2424", "#1e3c3c"];
    const LIGHT_COLORS = ["#c8dede", "#b0cccc", "#bcd4d4", "#a8c8c8", "#ccdede"];

    const cells: Cell[][] = [];
    for (let r = 0; r < GRID; r++) {
      cells[r] = [];
      for (let c = 0; c < GRID; c++) {
        const palette = theme === "dark" ? DARK_COLORS : LIGHT_COLORS;
        const isRoad = r % 3 === 0 || c % 3 === 0;
        const h = isRoad ? 0 : Math.floor(seededRand(r * 31 + c * 17) * 4) + 1;
        cells[r][c] = {
          type: isRoad ? "road" : "block",
          h,
          baseColor: palette[Math.floor(seededRand(r * 13 + c * 7) * palette.length)],
        };
      }
    }

    // ── Windows ───────────────────────────────────────────────────────
    type Win = {
      row: number; col: number; face: "left" | "right";
      wx: number; wy: number; on: boolean; flicker: number;
    };
    const wins: Win[] = [];
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const cell = cells[r][c];
        if (cell.type !== "block") continue;
        for (let floor = 0; floor < cell.h; floor++) {
          for (let f = 0; f < 2; f++) {
            wins.push({
              row: r, col: c,
              face: f === 0 ? "left" : "right",
              wx: 0.2 + seededRand(r*100 + c*50 + floor*7 + f) * 0.6,
              wy: (floor + 0.15 + seededRand(r*77 + c*33 + floor) * 0.1) / cell.h,
              on: seededRand(r*55 + c*23 + floor*3 + f) > 0.38,
              flicker: Math.floor(seededRand(r*99 + c*11 + floor) * 200) + 80,
            });
          }
        }
      }
    }

    // ── Route ─────────────────────────────────────────────────────────
    const PICKUP  = { c: 0, r: 0 };
    const DROPOFF = { c: 9, r: 6 };

    const routeWorldPts: [number, number][] = [
      [PICKUP.c  + 0.5, PICKUP.r  + 0.5],
      [PICKUP.c  + 0.5, DROPOFF.r + 0.5],
      [DROPOFF.c + 0.5, DROPOFF.r + 0.5],
    ];

    function routeScreenPts(): [number, number][] {
      return routeWorldPts.map(([gc, gr]) => isoProject(gc, gr));
    }

    function totalLen(pts: [number, number][]): number {
      let l = 0;
      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i][0] - pts[i-1][0], dy = pts[i][1] - pts[i-1][1];
        l += Math.sqrt(dx*dx + dy*dy);
      }
      return l;
    }

    function posOnRoute(t: number): { x: number; y: number; angle: number } {
      const pts = routeScreenPts();
      let rem = t * totalLen(pts);
      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i][0] - pts[i-1][0], dy = pts[i][1] - pts[i-1][1];
        const sl = Math.sqrt(dx*dx + dy*dy);
        if (rem <= sl) {
          const frac = rem / sl;
          return { x: pts[i-1][0] + dx*frac, y: pts[i-1][1] + dy*frac, angle: Math.atan2(dy, dx) };
        }
        rem -= sl;
      }
      const last = pts[pts.length-1], prev = pts[pts.length-2];
      return { x: last[0], y: last[1], angle: Math.atan2(last[1]-prev[1], last[0]-prev[0]) };
    }

    // ── Scooter state ─────────────────────────────────────────────────
    const scooter = {
      t: 0,
      speed: 0.0014,
      exhaust: [] as { x: number; y: number; r: number; a: number }[],
    };

    let frame = 0;

    // ── Colour helpers ────────────────────────────────────────────────
    function lerpHex(c1: string, c2: string, t: number): string {
      const parse = (s: string) => {
        const v = parseInt(s.replace("#", ""), 16);
        return [(v >> 16) & 255, (v >> 8) & 255, v & 255] as [number, number, number];
      };
      const [r1,g1,b1] = parse(c1), [r2,g2,b2] = parse(c2);
      return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
    }

    // ── Draw helpers ──────────────────────────────────────────────────
    function drawIsoCube(
      gx: number, gy: number, gh: number,
      topC: string, leftC: string, rightC: string
    ) {
      const [bx0,by0]=isoProject(gx,  gy,  0), [bx1,by1]=isoProject(gx+1,gy,  0);
      const [bx2,by2]=isoProject(gx+1,gy+1,0), [bx3,by3]=isoProject(gx,  gy+1,0);
      const [tx0,ty0]=isoProject(gx,  gy,  gh), [tx1,ty1]=isoProject(gx+1,gy,  gh);
      const [tx2,ty2]=isoProject(gx+1,gy+1,gh), [tx3,ty3]=isoProject(gx,  gy+1,gh);

      const outline = "rgba(0,0,0,0.18)";

      // left face
      ctx.beginPath();
      ctx.moveTo(bx0,by0);ctx.lineTo(bx3,by3);ctx.lineTo(tx3,ty3);ctx.lineTo(tx0,ty0);
      ctx.closePath(); ctx.fillStyle=leftC; ctx.fill();
      ctx.strokeStyle=outline; ctx.lineWidth=0.5; ctx.stroke();

      // right face
      ctx.beginPath();
      ctx.moveTo(bx1,by1);ctx.lineTo(bx2,by2);ctx.lineTo(tx2,ty2);ctx.lineTo(tx1,ty1);
      ctx.closePath(); ctx.fillStyle=rightC; ctx.fill();
      ctx.strokeStyle=outline; ctx.lineWidth=0.5; ctx.stroke();

      // top face
      ctx.beginPath();
      ctx.moveTo(tx0,ty0);ctx.lineTo(tx1,ty1);ctx.lineTo(tx2,ty2);ctx.lineTo(tx3,ty3);
      ctx.closePath(); ctx.fillStyle=topC; ctx.fill();
      ctx.strokeStyle=outline; ctx.lineWidth=0.5; ctx.stroke();
    }

    function drawCity() {
      const isDark = propsRef.current.theme === "dark";
      const whiteTarget  = isDark ? "#ffffff" : "#ffffff";
      const blackTarget  = isDark ? "#000000" : "#4a5a5a";
      const roadColor    = isDark ? "#141414" : "#d4d8d8";
      const roadStroke   = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
      const winColorA    = isDark ? "rgba(255,210,80,0.55)" : "rgba(255,240,180,0.8)";
      const winColorB    = isDark ? "rgba(255,210,80,0.3)"  : "rgba(255,240,180,0.5)";

      for (let r = GRID-1; r >= 0; r--) {
        for (let c = GRID-1; c >= 0; c--) {
          const cell = cells[r][c];
          if (cell.type === "road") {
            const [x0,y0]=isoProject(c,  r  ),[x1,y1]=isoProject(c+1,r  );
            const [x2,y2]=isoProject(c+1,r+1),[x3,y3]=isoProject(c,  r+1);
            ctx.beginPath();
            ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.lineTo(x2,y2);ctx.lineTo(x3,y3);
            ctx.closePath(); ctx.fillStyle=roadColor; ctx.fill();
            ctx.strokeStyle=roadStroke; ctx.lineWidth=0.5; ctx.stroke();

            // Dashed centre line on road rows
            if (r % 3 === 0 && c % 3 !== 0) {
              const [mx0,my0]=isoProject(c+0.45, r+0.5), [mx1,my1]=isoProject(c+0.55, r+0.5);
              ctx.beginPath(); ctx.moveTo(mx0,my0); ctx.lineTo(mx1,my1);
              ctx.strokeStyle = isDark ? "rgba(245,158,11,0.15)" : "rgba(47,79,79,0.18)";
              ctx.lineWidth = 1; ctx.setLineDash([3,5]); ctx.stroke(); ctx.setLineDash([]);
            }
          } else {
            const {h, baseColor} = cell;
            const top   = lerpHex(baseColor, whiteTarget, 0.12);
            const left  = lerpHex(baseColor, blackTarget, 0.18);
            const right = lerpHex(baseColor, blackTarget, 0.38);
            drawIsoCube(c, r, h, top, left, right);

            wins.filter(w => w.row===r && w.col===c).forEach(w => {
              const flicker = Math.sin(frame / w.flicker) > 0.97;
              if (!(w.on !== flicker)) return;
              const gz = h * w.wy;
              if (w.face === "left") {
                const [ax,ay]=isoProject(c, r+w.wx, gz);
                const [bx,by]=isoProject(c, r+w.wx+0.16, gz);
                const [cx2,cy2]=isoProject(c, r+w.wx+0.16, gz+0.3);
                const [dx,dy]=isoProject(c, r+w.wx, gz+0.3);
                ctx.beginPath();
                ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.lineTo(cx2,cy2);ctx.lineTo(dx,dy);
                ctx.closePath(); ctx.fillStyle=winColorA; ctx.fill();
              } else {
                const [ax,ay]=isoProject(c+w.wx, r+1, gz);
                const [bx,by]=isoProject(c+w.wx+0.16, r+1, gz);
                const [cx2,cy2]=isoProject(c+w.wx+0.16, r+1, gz+0.3);
                const [dx,dy]=isoProject(c+w.wx, r+1, gz+0.3);
                ctx.beginPath();
                ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.lineTo(cx2,cy2);ctx.lineTo(dx,dy);
                ctx.closePath(); ctx.fillStyle=winColorB; ctx.fill();
              }
            });
          }
        }
      }
    }

    function drawRoute() {
      const pts = routeScreenPts();
      ctx.save();
      ctx.shadowBlur = 10; ctx.shadowColor = "rgba(245,158,11,0.55)";
      ctx.setLineDash([9, 7]);
      ctx.lineDashOffset = -(frame * 0.5);
      ctx.strokeStyle = "rgba(245,158,11,0.75)";
      ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
      ctx.restore();
    }

    function drawMarker(x: number, y: number, color: string, label: string) {
      ctx.save();
      ctx.shadowBlur = 16; ctx.shadowColor = color;
      // pin triangle
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x-7, y-13); ctx.lineTo(x+7, y-13);
      ctx.closePath(); ctx.fillStyle = color; ctx.fill();
      // pin circle
      ctx.beginPath(); ctx.arc(x, y-22, 10, 0, Math.PI*2); ctx.fillStyle = color; ctx.fill();
      ctx.shadowBlur = 0;
      // white inner
      ctx.beginPath(); ctx.arc(x, y-22, 4, 0, Math.PI*2); ctx.fillStyle = "#fff"; ctx.fill();
      // label
      ctx.font = "bold 9px system-ui, sans-serif"; ctx.textAlign = "center";
      const tw = ctx.measureText(label).width + 12;
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.beginPath(); ctx.roundRect(x - tw/2, y-44, tw, 14, 4); ctx.fill();
      ctx.fillStyle = color; ctx.fillText(label, x, y-33);
      ctx.restore();
    }

    function drawIsoScooter(sx: number, sy: number, angle: number) {
      const isDark = propsRef.current.theme === "dark";
      ctx.save();
      ctx.translate(sx, sy);

      // ground shadow
      ctx.beginPath(); ctx.ellipse(0, 5, 15, 4, angle, 0, Math.PI*2);
      ctx.fillStyle = isDark ? "rgba(0,0,0,0.4)" : "rgba(47,79,79,0.18)"; ctx.fill();

      const cos = Math.cos(angle), sin = Math.sin(angle);
      const len = 17, wid = 7;

      // body diamond
      const pts: [number, number][] = [
        [ cos*len,         sin*len        ],
        [ cos*2 - sin*wid, sin*2 + cos*wid],
        [-cos*5,          -sin*5          ],
        [ cos*2 + sin*wid, sin*2 - cos*wid],
      ];
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      pts.slice(1).forEach(([px,py]) => ctx.lineTo(px, py));
      ctx.closePath();
      ctx.fillStyle = "#2F4F4F"; ctx.fill();
      ctx.strokeStyle = isDark ? "#4a8080" : "#3d6666"; ctx.lineWidth = 1; ctx.stroke();

      // delivery parcel box
      ctx.save();
      ctx.translate(-cos*3, -sin*3); ctx.rotate(angle);
      ctx.fillStyle = isDark ? "#1a3535" : "#2a4848"; ctx.fillRect(-5, -5, 10, 10);
      ctx.strokeStyle = "#F59E0B"; ctx.lineWidth = 0.9; ctx.strokeRect(-5, -5, 10, 10);
      // cross tape lines
      ctx.beginPath(); ctx.moveTo(-5,-5); ctx.lineTo(5,5);
      ctx.moveTo(5,-5); ctx.lineTo(-5,5);
      ctx.strokeStyle = "rgba(245,158,11,0.4)"; ctx.lineWidth = 0.5; ctx.stroke();
      ctx.restore();

      // headlight glow
      ctx.save();
      ctx.shadowBlur = 8; ctx.shadowColor = "#F59E0B";
      ctx.beginPath(); ctx.arc(cos*(len-2), sin*(len-2), 3, 0, Math.PI*2);
      ctx.fillStyle = "#F59E0B"; ctx.fill();
      ctx.restore();

      // wheels
      ([[cos*(len-4), sin*(len-4)], [-cos*3, -sin*3]] as [number,number][]).forEach(([wx,wy]) => {
        ctx.beginPath(); ctx.arc(wx, wy, 4, 0, Math.PI*2);
        ctx.fillStyle = isDark ? "#111" : "#334"; ctx.fill();
        ctx.strokeStyle = isDark ? "#444" : "#667"; ctx.lineWidth = 1.2; ctx.stroke();
      });

      ctx.restore();
    }

    /** Stamp an edge-fade mask over the canvas so the city dissolves into bg */
    function stampEdgeFade() {
      const { fadeColor } = propsRef.current;

      const bTop    = H * 0.30;
      const bBottom = H * 0.38;
      const bLeft   = W * 0.32;
      const bRight  = W * 0.30;

      const dirs: [CanvasGradient, number, number, number, number][] = [
        [ctx.createLinearGradient(0, 0, 0, bTop),          0, 0, W, bTop],
        [ctx.createLinearGradient(0, H, 0, H - bBottom),   0, H - bBottom, W, bBottom],
        [ctx.createLinearGradient(0, 0, bLeft, 0),         0, 0, bLeft, H],
        [ctx.createLinearGradient(W, 0, W - bRight, 0),    W - bRight, 0, bRight, H],
      ];

      dirs.forEach(([grad, rx, ry, rw, rh]) => {
        grad.addColorStop(0, fadeColor);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(rx, ry, rw, rh);
      });
    }

    // ── Main animation loop ───────────────────────────────────────────
    function loop() {
      frame++;
      ctx.clearRect(0, 0, W, H);

      // Draw city scene
      drawCity();
      drawRoute();

      // Markers
      const pSc = isoProject(PICKUP.c  + 0.5, PICKUP.r  + 0.5);
      const dSc = isoProject(DROPOFF.c + 0.5, DROPOFF.r + 0.5);
      drawMarker(pSc[0], pSc[1], "#22c55e", "PICKUP");
      drawMarker(dSc[0], dSc[1], "#F59E0B", "DROP-OFF");

      // Scooter
      scooter.t += scooter.speed;
      if (scooter.t > 1) scooter.t = 0;
      const pos = posOnRoute(scooter.t);

      const exA = pos.angle + Math.PI;
      if (frame % 4 === 0)
        scooter.exhaust.push({ x: pos.x + Math.cos(exA)*10, y: pos.y + Math.sin(exA)*10, r: 2, a: 0.38 });
      scooter.exhaust = scooter.exhaust
        .map(p => ({ ...p, x: p.x + (Math.random()-0.5)*0.4, y: p.y - 0.35, r: p.r+0.22, a: p.a-0.028 }))
        .filter(p => p.a > 0);
      scooter.exhaust.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(160,160,160,${p.a})`; ctx.fill();
      });

      drawIsoScooter(pos.x, pos.y, pos.angle);

      // ── Edge fade: city dissolves into hero background ────────────
      stampEdgeFade();

      animRef.current = requestAnimationFrame(loop);
    }

    loop();

    function onResize() {
      if (!canvas) return;
      W = canvas.width  = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    }
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", onResize);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once; props are read via propsRef

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ display: "block" }}
    />
  );
}
