import { spawn } from "node:child_process";
import { cp, mkdir } from "node:fs/promises";
import { validateEnvironment } from "./validate-env.mjs";
const [command, ...args] = process.argv.slice(2);
if (!["dev", "build", "start"].includes(command))
  throw new Error("Use dev, build, or start.");
process.env.TEAMPLUS_BUILD_TARGET = "production";
process.env.NODE_ENV = command === "dev" ? "development" : "production";
if (command !== "build") validateEnvironment();
const bin =
  command === "start"
    ? ".next-production/standalone/server.js"
    : "node_modules/next/dist/bin/next";
const flags =
  command === "start"
    ? []
    : [
        command,
        ...(args.includes("--turbopack") ? [] : ["--webpack"]),
        ...(command === "dev"
          ? ["--port", "3000", "--hostname", "127.0.0.1"]
          : []),
        ...args,
      ];
if (command === "start") process.env.HOSTNAME ||= "127.0.0.1";
const child = spawn(process.execPath, [bin, ...flags], {
  stdio: "inherit",
  env: process.env,
});
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => child.kill(signal));
const status = await new Promise((resolve, reject) => {
  child.on("error", reject);
  child.on("exit", (code) => resolve(code ?? 1));
});
if (status === 0 && command === "build") {
  await mkdir(".next-production/standalone/.next-production", {
    recursive: true,
  });
  await cp(
    ".next-production/static",
    ".next-production/standalone/.next-production/static",
    { recursive: true },
  );
  await cp("public", ".next-production/standalone/public", { recursive: true });
}
process.exitCode = status;
