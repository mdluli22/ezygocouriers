import { request } from "node:https";

/** Keep Routes traffic on the IPv4 address allowed by our server API key. */
export function requestGoogleRoute(key: string, body: string): Promise<Response> {
  return new Promise((resolve, reject) => {
    const req = request("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      family: 4,
      signal: AbortSignal.timeout(8000),
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "routes.distanceMeters",
      },
    }, response => {
      const chunks: Buffer[] = [];
      let bytes = 0;
      response.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > 1024 * 1024) {
          req.destroy(new Error("Routes response exceeded size limit"));
          return;
        }
        chunks.push(chunk);
      });
      response.on("error", reject);
      response.on("end", () => {
        resolve(new Response(Buffer.concat(chunks), { status: response.statusCode ?? 502 }));
      });
    });
    req.on("error", reject);
    req.end(body);
  });
}
