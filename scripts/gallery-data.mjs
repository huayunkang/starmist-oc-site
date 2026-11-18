import { randomUUID } from "node:crypto";
import { mkdir, readFile, realpath, rename, rm, rmdir, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

// All writers lock the canonical data file, including --data overrides and symlinks.
// Never steal an old lock: a slow or paused writer may still own it.
export async function updateGallery(file, update, { timeoutMs = 30_000 } = {}) {
  const target = await realpath(file);
  const lock = `${target}.lock`;
  const deadline = Date.now() + timeoutMs;
  while (true) {
    try { await mkdir(lock); break; }
    catch (error) {
      if (error.code !== "EEXIST") throw error;
      if (Date.now() >= deadline) throw new Error(`Timed out waiting for gallery lock: ${lock}. If a writer crashed, stop all writers before removing this lock directory.`);
      await delay(25);
    }
  }
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
  try {
    const records = JSON.parse(await readFile(target, "utf8"));
    if (!Array.isArray(records)) throw new Error("Gallery data must be an array.");
    const result = await update(records);
    await writeFile(temporary, `${JSON.stringify(records, null, 2)}\n`, "utf8");
    await rename(temporary, target);
    return result;
  } finally {
    try { await rm(temporary, { force: true }); }
    finally { await rmdir(lock); }
  }
}
