import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { updateGallery } from "../scripts/gallery-data.mjs";

function start(script, args = [], env = {}) {
  const child = spawn(process.execPath, [script, ...args], { env: { ...process.env, ...env } });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk; });
  child.stderr.on("data", chunk => { output += chunk; });
  const done = once(child, "exit").then(([code]) => { assert.equal(code, 0, output); });
  // Servers are terminated during cleanup, so only importers await done.
  done.catch(() => {});
  return { child, done, output: () => output };
}
async function until(check) {
  for (let i = 0; i < 200; i++) {
    if (check()) return;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw new Error("Timed out waiting for process output");
}

test("overlapping imports merge fresh state while PATCH and batch saves survive", { timeout: 20_000 }, async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), "starmist-concurrent-test-"));
  const data = path.join(fixture, "custom.json");
  const input = path.join(fixture, "input");
  const children = [];
  try {
    await mkdir(input);
    await writeFile(data, JSON.stringify([{ id: "existing", title: "Old", category: "Archive", tags: [] }]));
    await sharp({ create: { width: 80, height: 60, channels: 3, background: "#7b6ab0" } }).png().toFile(path.join(input, "canon_new.png"));
    const { createServer } = await import("node:net");
    const probe = createServer();
    await new Promise(resolve => probe.listen(0, "127.0.0.1", resolve));
    const port = probe.address().port;
    await new Promise(resolve => probe.close(resolve));
    const server = start("scripts/local-admin-api.mjs", [], { STARMIST_ADMIN_DATA_FILE: data, STARMIST_ADMIN_PORT: String(port) });
    children.push(server.child);
    await until(() => server.output().includes("接口已启动"));
    const base = `http://127.0.0.1:${port}`;
    const args = ["--input", input, "--data", data, "--originals", path.join(fixture, "originals"), "--public", path.join(fixture, "public")];
    let imports, requests;
    await updateGallery(data, async records => {
      imports = [start("scripts/import-images.mjs", args), start("scripts/import-images.mjs", args)];
      children.push(...imports.map(run => run.child));
      await until(() => imports.every(run => run.output().includes("已处理")));
      // Both importers have read their initial snapshot and prepared the same image.
      // A committed edit and extra record must survive their final fresh-state merge.
      records[0].description = "Saved during image conversion";
      records.push({ id: "concurrent-record", title: "Keep me", category: "Story", tags: [] });
      requests = [
        fetch(`${base}/works/existing`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Admin title" }) }),
        fetch(`${base}/batch`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: ["existing"], category: "Canon", addTags: ["saved"], removeTags: [] }) }),
      ];
    });
    for (const response of await Promise.all(requests)) assert.equal(response.status, 200, await response.text());
    await Promise.all(imports.map(run => run.done));
    const records = JSON.parse(await readFile(data, "utf8"));
    assert.equal(records.length, 3);
    assert.equal(records.filter(record => record.hash).length, 1);
    assert.equal(records[0].title, "Admin title");
    assert.equal(records[0].description, "Saved during image conversion");
    assert.equal(records[0].category, "Canon");
    assert.deepEqual(records[0].tags, ["saved"]);
    assert.ok(records.some(record => record.id === "concurrent-record"));
    assert.ok(imports.some(run => /新增 0 张，跳过重复 1 张/.test(run.output())));
  } finally {
    await Promise.all(children.filter(child => child.exitCode === null && child.signalCode === null).map(async child => { const exited = once(child, "exit"); child.kill(); await exited; }));
    await rm(fixture, { recursive: true, force: true });
  }
});
