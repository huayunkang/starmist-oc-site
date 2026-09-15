import { spawn } from "node:child_process";
import path from "node:path";

const children = [
  spawn(process.execPath, [path.join("scripts", "local-admin-api.mjs")], { stdio: "inherit" }),
  spawn(process.execPath, [path.join("scripts", "run-framework.mjs"), "dev"], { stdio: "inherit" }),
];
function stop() { for (const child of children) if (child.exitCode === null) child.kill(); }
process.on("SIGINT", stop); process.on("SIGTERM", stop);
for (const child of children) child.on("exit", code => {
  if (code && code !== 0) process.exitCode = code;
  stop();
});
