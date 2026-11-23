import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const next = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const result = spawnSync(process.execPath, [next, "build", "--webpack"], {
  env: { ...process.env, STARMIST_CLOUDFLARE_STATIC: "1", NEXT_TELEMETRY_DISABLED: "1" },
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
