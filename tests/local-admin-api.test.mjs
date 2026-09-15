import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

async function freePort() {
  const server = createServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

test("local admin saves one record and applies bulk category and tag edits", async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), "starmist-admin-test-"));
  const data = path.join(fixture, "works.json");
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  await writeFile(data, JSON.stringify([
    { id: "SM-1", title: "First", category: "Uncategorized", state: "未设置", canon: false, tags: [], style: "未设置", clothing: "未设置", location: "未设置", description: "" },
    { id: "SM-2", title: "Second", category: "Archive", state: "日常", canon: false, tags: ["旧图"], style: "草图", clothing: "未设置", location: "未设置", description: "" },
  ]));
  const child = spawn(process.execPath, ["scripts/local-admin-api.mjs"], { cwd: process.cwd(), env: { ...process.env, STARMIST_ADMIN_DATA_FILE: data, STARMIST_ADMIN_PORT: String(port) }, stdio: "ignore" });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      try { const response = await fetch(`${base}/works`); if (response.ok) { ready = true; break; } }
      catch { await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    assert.ok(ready, "admin server did not start");
    const changed = await fetch(`${base}/works/SM-1`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "侦探星雾", category: "Canon", state: "侦探", style: "动画", tags: ["主设定"], description: "官方记录" }) });
    assert.equal(changed.status, 200);
    assert.equal((await changed.json()).canon, true);
    const batch = await fetch(`${base}/batch`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: ["SM-1", "SM-2"], category: "Story", addTags: ["雨夜"], removeTags: ["旧图"] }) });
    assert.equal(batch.status, 200);
    assert.equal((await batch.json()).updated, 2);
    const records = JSON.parse(await readFile(data, "utf8"));
    assert.equal(records[0].title, "侦探星雾");
    assert.equal(records[0].state, "侦探");
    assert.deepEqual(records.map(record => record.category), ["Story", "Story"]);
    assert.deepEqual(records.map(record => record.canon), [false, false]);
    assert.deepEqual(records[0].tags, ["主设定", "雨夜"]);
    assert.deepEqual(records[1].tags, ["雨夜"]);
  } finally {
    child.kill();
    const safe = path.resolve(fixture).startsWith(path.resolve(tmpdir()) + path.sep) && path.basename(fixture).startsWith("starmist-admin-test-");
    if (safe) await rm(fixture, { recursive: true, force: true });
  }
});
