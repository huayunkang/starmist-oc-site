import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
sharp.cache(false);

test("imports, optimizes and deduplicates a mixed image batch", async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), "starmist-import-test-"));
  const input = path.join(fixture, "input");
  const originals = path.join(fixture, "originals");
  const publicDir = path.join(fixture, "public");
  const data = path.join(fixture, "works.json");
  try {
    await mkdir(input);
    await writeFile(data, "[]\n");
    await sharp({ create: { width: 900, height: 600, channels: 3, background: "#7b6ab0" } }).png().toFile(path.join(input, "canon_侦探状态.png"));
    await copyFile(path.join(input, "canon_侦探状态.png"), path.join(input, "copy.png"));
    await sharp({ create: { width: 700, height: 1100, channels: 3, background: "#20304a" } }).webp().toFile(path.join(input, "未分类.webp"));
    const command = ["scripts/import-images.mjs", "--input", input, "--originals", originals, "--public", publicDir, "--data", data];
    const first = spawnSync(process.execPath, command, { cwd: process.cwd(), encoding: "utf8" });
    assert.equal(first.status, 0, first.stderr);
    const records = JSON.parse(await readFile(data, "utf8"));
    assert.equal(records.length, 2);
    assert.equal(records.find(record => record.category === "Canon")?.title, "侦探状态");
    assert.equal(records.find(record => record.category === "Uncategorized")?.state, "未设置");
    assert.equal(new Set(records.map(record => record.id)).size, 2);
    assert.equal((await readdir(originals)).length, 2);
    for (const record of records) {
      const full = await sharp(path.join(publicDir, "full", path.basename(record.image))).metadata();
      const thumb = await sharp(path.join(publicDir, "thumbs", path.basename(record.thumbnail))).metadata();
      assert.equal(full.format, "webp"); assert.equal(thumb.format, "webp");
      assert.ok(thumb.width <= 480 && thumb.height <= 640);
      assert.ok(full.width <= 1800 && full.height <= 1800);
    }
    const second = spawnSync(process.execPath, command, { cwd: process.cwd(), encoding: "utf8" });
    assert.equal(second.status, 0, second.stderr);
    assert.match(second.stdout, /新增 0 张/);
    assert.equal(JSON.parse(await readFile(data, "utf8")).length, 2);
  } finally {
    const safe = path.resolve(fixture).startsWith(path.resolve(tmpdir()) + path.sep) && path.basename(fixture).startsWith("starmist-import-test-");
    if (safe) {
      for (let attempt = 0; attempt < 10; attempt++) {
        try { await rm(fixture, { recursive: true, force: true }); break; }
        catch (error) {
          if (attempt === 9) throw error;
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      }
    }
  }
});
