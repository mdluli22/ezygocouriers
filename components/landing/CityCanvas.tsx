"use client";

import { useEffect, useRef } from "react";

export default function CityCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);

  useEffect(() => {
    const canvas  = canvasRef.current;
    if (!canvas) return;
    const ctx     = canvas.getContext("2d")!;
    let W = canvas.width  = canvas.offsetWidth;
    let H = canvas.height = canvas.offsetHeight;

    const PRIMARY  = "#2F4F4F";
    const DARK     = "#1A2F2F";
    const ACCENT   = "#F59E0B";
    const SKY1     = "#0D1F1F";
    const SKY2     = "#1A2F2F";
    const ROAD     = "#1C1C1C";
    const STRIPE   = "#F59E0B";
    const SIDEWALK = "#243B3B";
    const GLASS    = "rgba(245,158,11,0.15)";
    const GLASS2   = "rgba(47,120,120,0.2)";

    const stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.55,
      r: Math.random() * 1.5 + 0.3,
      a: Math.random(),
      speed: Math.random() * 0.005 + 0.002,
      phase: Math.random() * Math.PI * 2,
    }));

    type Building = {
      x: number; w: number; h: number;
      color: string; windows: { x: number; y: number; on: boolean; flicker: number }[];
      layer: number;
    };

    function makeBuilding(x: number, w: number, h: number, layer: number): Building {
      const colors = [PRIMARY, DARK, "#243B3B", "#1E3535", "#162A2A"];
      const windows: Building["windows"] = [];
      const cols = Math.floor(w / 14);
      const rows = Math.floor(h / 18);
      for (let c = 0; c < cols; c++)
        for (let r = 0; r < rows; r++)
          windows.push({ x: x + 6 + c * 14, y: H - h + 8 + r * 18, on: Math.random() > 0.35, flicker: Math.random() * 200 + 80 });
      return { x, w, h, color: colors[Math.floor(Math.random() * colors.length)], windows, layer };
    }

    const bgBuildings: Building[] = [];
    for (let x = -20; x < W + 20; x += Math.random() * 55 + 35)
      bgBuildings.push(makeBuilding(x, Math.random() * 40 + 25, Math.random() * 120 + 60, 0));

    const fgBuildings: Building[] = [];
    for (let x = -20; x < W + 20; x += Math.random() * 70 + 45)
      fgBuildings.push(makeBuilding(x, Math.random() * 55 + 35, Math.random() * 160 + 90, 1));

    const ROAD_Y  = H * 0.72;
    const ROAD_H  = H * 0.28;
    const ROAD_CY = ROAD_Y + ROAD_H * 0.4;

    const scooter = { x: -80, y: ROAD_CY - 22, speed: 1.8, exhaust: [] as { x: number; y: number; r: number; a: number }[], wheel: 0 };
    const dashes: { x: number }[] = [];
    for (let x = 0; x < W + 80; x += 70) dashes.push({ x });
    const lamps: { x: number }[] = [];
    for (let x = 60; x < W + 60; x += 160) lamps.push({ x });

    let frame = 0;

    function drawSky() {
      const grad = ctx.createLinearGradient(0, 0, 0, ROAD_Y);
      grad.addColorStop(0, SKY1); grad.addColorStop(1, SKY2);
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, ROAD_Y);
    }

    function drawStars() {
      stars.forEach((s) => {
        s.a = 0.4 + 0.6 * Math.sin(frame * s.speed + s.phase);
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,220,${s.a})`; ctx.fill();
      });
    }

    function drawMoon() {
      const mx = W * 0.82, my = H * 0.12;
      const glow = ctx.createRadialGradient(mx, my, 0, mx, my, 45);
      glow.addColorStop(0, "rgba(245,220,120,0.18)"); glow.addColorStop(1, "rgba(245,220,120,0)");
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(mx, my, 45, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(mx, my, 18, 0, Math.PI * 2); ctx.fillStyle = "#F5DC78"; ctx.fill();
      ctx.beginPath(); ctx.arc(mx + 6, my - 3, 14, 0, Math.PI * 2); ctx.fillStyle = SKY1; ctx.fill();
    }

    function drawBuilding(b: Building, alpha: number) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = b.color; ctx.fillRect(b.x, H - b.h, b.w, b.h);
      ctx.fillStyle = b.layer === 1 ? "#3D6666" : "#243B3B"; ctx.fillRect(b.x + 4, H - b.h - 4, b.w - 8, 6);
      if (b.w > 45) {
        ctx.strokeStyle = "#3D6666"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(b.x + b.w / 2, H - b.h - 4); ctx.lineTo(b.x + b.w / 2, H - b.h - 18); ctx.stroke();
        ctx.beginPath(); ctx.arc(b.x + b.w / 2, H - b.h - 19, 2, 0, Math.PI * 2); ctx.fillStyle = ACCENT; ctx.fill();
      }
      b.windows.forEach((w) => {
        const flicker = Math.sin(frame / w.flicker) > 0.98;
        const on = w.on !== flicker;
        if (on) {
          ctx.fillStyle = Math.random() > 0.95 ? GLASS2 : GLASS; ctx.fillRect(w.x, w.y, 8, 10);
          const wg = ctx.createRadialGradient(w.x + 4, w.y + 5, 0, w.x + 4, w.y + 5, 10);
          wg.addColorStop(0, "rgba(245,158,11,0.12)"); wg.addColorStop(1, "rgba(245,158,11,0)");
          ctx.fillStyle = wg; ctx.fillRect(w.x - 6, w.y - 5, 20, 20);
        } else { ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(w.x, w.y, 8, 10); }
      });
      ctx.globalAlpha = 1;
    }

    function drawRoad() {
      const roadGrad = ctx.createLinearGradient(0, ROAD_Y, 0, H);
      roadGrad.addColorStop(0, "#222222"); roadGrad.addColorStop(1, "#111111");
      ctx.fillStyle = roadGrad; ctx.fillRect(0, ROAD_Y, W, ROAD_H);
      ctx.fillStyle = SIDEWALK; ctx.fillRect(0, ROAD_Y, W, 12); ctx.fillRect(0, H - 8, W, 8);
      ctx.fillStyle = "#3D6666"; ctx.fillRect(0, ROAD_Y + 10, W, 2);
      dashes.forEach((d) => {
        d.x -= scooter.speed * 0.5;
        if (d.x < -70) d.x += W + 140;
        ctx.fillStyle = STRIPE; ctx.globalAlpha = 0.6; ctx.fillRect(d.x, ROAD_CY + 6, 45, 3); ctx.globalAlpha = 1;
      });
      ctx.strokeStyle = "rgba(245,158,11,0.3)"; ctx.lineWidth = 1.5; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(0, ROAD_Y + 12); ctx.lineTo(W, ROAD_Y + 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, H - 8); ctx.lineTo(W, H - 8); ctx.stroke();
    }

    function drawLamps() {
      lamps.forEach((l) => {
        const lx = ((l.x - frame * 0.4) % (W + 100) + W + 100) % (W + 100) - 50;
        ctx.strokeStyle = "#3D6666"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(lx, ROAD_Y + 12); ctx.lineTo(lx, ROAD_Y - 55); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(lx, ROAD_Y - 55); ctx.lineTo(lx + 18, ROAD_Y - 60); ctx.stroke();
        ctx.fillStyle = "#4A7070"; ctx.beginPath(); ctx.roundRect(lx + 10, ROAD_Y - 68, 22, 10, 3); ctx.fill();
        const cone = ctx.createRadialGradient(lx + 21, ROAD_Y - 58, 0, lx + 21, ROAD_Y - 58, 60);
        cone.addColorStop(0, "rgba(245,200,80,0.22)"); cone.addColorStop(1, "rgba(245,200,80,0)");
        ctx.fillStyle = cone; ctx.beginPath(); ctx.arc(lx + 21, ROAD_Y - 58, 60, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(lx + 21, ROAD_Y - 62, 3, 0, Math.PI * 2); ctx.fillStyle = "#FDE68A"; ctx.fill();
      });
    }

    function drawWheel(c: CanvasRenderingContext2D, wx: number, wy: number, angle: number) {
      c.beginPath(); c.arc(wx, wy, 10, 0, Math.PI * 2); c.fillStyle = "#111"; c.fill();
      c.strokeStyle = "#333"; c.lineWidth = 2; c.stroke();
      c.beginPath(); c.arc(wx, wy, 6, 0, Math.PI * 2); c.strokeStyle = "#4A7070"; c.lineWidth = 2; c.stroke();
      for (let i = 0; i < 4; i++) {
        const a = angle + (i * Math.PI) / 2;
        c.beginPath(); c.moveTo(wx + Math.cos(a) * 2, wy + Math.sin(a) * 2);
        c.lineTo(wx + Math.cos(a) * 8, wy + Math.sin(a) * 8); c.strokeStyle = "#5A8080"; c.lineWidth = 1.2; c.stroke();
      }
      c.beginPath(); c.arc(wx, wy, 2.5, 0, Math.PI * 2); c.fillStyle = ACCENT; c.fill();
    }

    function drawScooter() {
      const sx = scooter.x, sy = scooter.y;
      scooter.wheel += 0.22;
      if (frame % 6 === 0) scooter.exhaust.push({ x: sx - 2, y: sy + 28, r: 3, a: 0.5 });
      scooter.exhaust = scooter.exhaust
        .map((p) => ({ ...p, x: p.x - 1.2, y: p.y - 0.4, r: p.r + 0.4, a: p.a - 0.03 }))
        .filter((p) => p.a > 0);
      scooter.exhaust.forEach((p) => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,200,180,${p.a})`; ctx.fill();
      });
      ctx.save(); ctx.translate(sx, sy);
      ctx.beginPath(); ctx.ellipse(22, 42, 28, 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fill();
      drawWheel(ctx, 8, 32, scooter.wheel);
      drawWheel(ctx, 38, 32, scooter.wheel);
      ctx.beginPath();
      ctx.moveTo(10, 32); ctx.lineTo(6, 16); ctx.lineTo(14, 8);
      ctx.lineTo(30, 8); ctx.lineTo(40, 16); ctx.lineTo(44, 32);
      ctx.closePath(); ctx.fillStyle = PRIMARY; ctx.fill();
      ctx.strokeStyle = "#3D7070"; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(12, 20); ctx.lineTo(38, 20);
      ctx.strokeStyle = ACCENT; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.roundRect(14, 6, 18, 5, 2); ctx.fillStyle = "#1A2F2F"; ctx.fill();
      ctx.strokeStyle = "#3D7070"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(36, 8); ctx.lineTo(42, 4); ctx.stroke();
      ctx.beginPath(); ctx.arc(42, 4, 3, 0, Math.PI * 2); ctx.fillStyle = DARK; ctx.fill();
      ctx.beginPath(); ctx.arc(45, 16, 4, 0, Math.PI * 2); ctx.fillStyle = "#FDE68A"; ctx.fill();
      const hl = ctx.createRadialGradient(48, 16, 0, 65, 16, 28);
      hl.addColorStop(0, "rgba(253,230,138,0.5)"); hl.addColorStop(1, "rgba(253,230,138,0)");
      ctx.fillStyle = hl;
      ctx.beginPath(); ctx.moveTo(48, 10); ctx.lineTo(80, 4); ctx.lineTo(80, 28); ctx.lineTo(48, 22); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.roundRect(18, -14, 14, 18, 4); ctx.fillStyle = "#3D6666"; ctx.fill();
      ctx.beginPath(); ctx.arc(25, -18, 10, Math.PI, 0); ctx.fillStyle = ACCENT; ctx.fill();
      ctx.beginPath(); ctx.arc(25, -18, 10, 0, Math.PI); ctx.fillStyle = "#D97706"; ctx.fill();
      ctx.beginPath(); ctx.arc(25, -16, 6, 0.1, Math.PI - 0.1);
      ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(30, -8); ctx.lineTo(38, -2);
      ctx.strokeStyle = "#3D6666"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.stroke();
      ctx.restore();
    }

    function drawCityReflection() {
      ctx.save(); ctx.globalAlpha = 0.08; ctx.scale(1, -0.15);
      ctx.translate(0, -(ROAD_Y + ROAD_H) * (1 / 0.15) - ROAD_Y * 2);
      fgBuildings.forEach((b) => drawBuilding(b, 1));
      ctx.restore();
    }

    function loop() {
      frame++;
      ctx.clearRect(0, 0, W, H);
      drawSky(); drawStars(); drawMoon();
      bgBuildings.forEach((b) => drawBuilding(b, 0.5));
      drawLamps(); drawRoad(); drawCityReflection();
      fgBuildings.forEach((b) => drawBuilding(b, 1));
      scooter.x += scooter.speed;
      if (scooter.x > W + 100) scooter.x = -100;
      drawScooter();
      animRef.current = requestAnimationFrame(loop);
    }

    loop();
    function onResize() { if (!canvas) return; W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; }
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", onResize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ display: "block" }} />;
}
