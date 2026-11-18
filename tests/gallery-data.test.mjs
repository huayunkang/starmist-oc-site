import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { updateGallery } from "../scripts/gallery-data.mjs";

const helper = pathToFileURL(path.resolve("scripts/gallery-data.mjs")).href;
function writer(file, id) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--input-type=module", "-e", `
      import { updateGallery } from ${JSON.stringify(helper)};
      await updateGallery(${JSON.stringify(file)}, async records => {
        await new Promise(resolve => setTimeout(resolve, 20));
        records.push({ id: ${JSON.stringify(id)} });
      });`]);
    let stderr = "";
    child.stderr.on("data", data => { stderr += data; });
    child.on("error", reject);
    child.on("exit", code => code === 0 ? resolve() : reject(new Error(stderr)));
  });
}

test("independent processes serialize read-modify-write on a custom data file", async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), "starmist-lock-test-"));
  const file = path.join(fixture, "custom.json");
  try {
    await writeFile(file, "[]\n");
    await Promise.all(Array.from({ length: 12 }, (_, i) => writer(file, `id-${i}`)));
    const records = JSON.parse(await readFile(file, "utf8"));
    assert.equal(records.length, 12);
    assert.equal(new Set(records.map(record => record.id)).size, 12);
    assert.deepEqual(await readdir(fixture), ["custom.json"]);
  } finally { await rm(fixture, { recursive: true, force: true }); }
});

test("failed updates leave the original intact and release their lock", async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), "starmist-lock-test-"));
  const file = path.join(fixture, "works.json");
  try {
    await writeFile(file, "[]\n");
    await assert.rejects(updateGallery(file, records => { records.push({ id: "bad" }); throw new Error("failed"); }), /failed/);
    assert.equal(await readFile(file, "utf8"), "[]\n");
    await updateGallery(file, records => records.push({ id: "good" }));
    assert.deepEqual(JSON.parse(await readFile(file, "utf8")), [{ id: "good" }]);
    await writeFile(file, "invalid json");
    await assert.rejects(updateGallery(file, () => {}), SyntaxError);
    assert.equal(await readFile(file, "utf8"), "invalid json");
    assert.deepEqual(await readdir(fixture), ["works.json"]);
  } finally { await rm(fixture, { recursive: true, force: true }); }
});

test("lock timeout does not steal the current writer's lock", async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), "starmist-lock-test-"));
  const file = path.join(fixture, "works.json");
  try {
    await writeFile(file, "[]\n");
    await updateGallery(file, async records => {
      await assert.rejects(updateGallery(file, () => {}, { timeoutMs: 25 }), /Timed out/);
      records.push({ id: "owner" });
    });
    assert.deepEqual(JSON.parse(await readFile(file, "utf8")), [{ id: "owner" }]);
  } finally { await rm(fixture, { recursive: true, force: true }); }
});
