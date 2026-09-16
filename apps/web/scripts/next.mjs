import nextEnv from "@next/env";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const command = process.argv[2];
if (!["dev", "build", "start"].includes(command)) {
  throw new Error("Expected dev, build, or start.");
}
process.env.NODE_ENV ??= command === "dev" ? "development" : "production";
// Preserve the root .env/.env.local setup used by Docker and local development.
nextEnv.loadEnvConfig(fileURLToPath(new URL("../../../", import.meta.url)), command === "dev");
const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), ...process.argv.slice(2)], {
  cwd: fileURLToPath(new URL("../", import.meta.url)),
  env: process.env,
  stdio: "inherit",
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("error", (error) => { console.error(error); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
