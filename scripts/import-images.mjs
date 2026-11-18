import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { updateGallery } from "./gallery-data.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
function option(name, fallback) {
  const position = args.indexOf(name);
  return position === -1 ? fallback : path.resolve(args[position + 1]);
}

const inputDir = option("--input", path.join(root, "import-images"));
const originalsDir = option("--originals", path.join(root, "original-images"));
const publicDir = option("--public", path.join(root, "public", "images", "starmist"));
const dataFile = option("--data", path.join(root, "src", "data", "starmist-images.json"));
const extensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const categoryMap = { canon: "Canon", story: "Story", variant: "Variant", archive: "Archive" };

async function findImages(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await findImages(fullPath));
    else if (entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase())) files.push(fullPath);
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function titleAndCategory(filename) {
  const stem = path.parse(filename).name;
  const match = /^(canon|story|variant|archive)_/i.exec(stem);
  const category = match ? categoryMap[match[1].toLowerCase()] : "Uncategorized";
  const title = (match ? stem.slice(match[0].length) : stem)
    .replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim() || "未命名作品";
  return { title, category };
}

async function main() {
  await mkdir(inputDir, { recursive: true });
  await mkdir(originalsDir, { recursive: true });
  await mkdir(path.join(publicDir, "full"), { recursive: true });
  await mkdir(path.join(publicDir, "thumbs"), { recursive: true });
  const records = JSON.parse(await readFile(dataFile, "utf8"));
  if (!Array.isArray(records)) throw new Error("Gallery data must be an array.");
  const knownHashes = new Set(records.map(record => record.hash).filter(Boolean));
  const knownIds = new Set(records.map(record => record.id));
  const pending = [];
  const files = await findImages(inputDir);
  let imported = 0, duplicates = 0, failed = 0;
  for (const file of files) {
    try {
      const bytes = await readFile(file);
      const hash = createHash("sha256").update(bytes).digest("hex");
      if (knownHashes.has(hash)) { duplicates++; continue; }
      const id = `SM-I-${hash.slice(0, 16).toUpperCase()}`;
      if (knownIds.has(id)) throw new Error("ID collision; image not imported.");
      const ext = path.extname(file).toLowerCase();
      const filename = hash.slice(0, 20);
      const originalName = `${filename}${ext}`;
      const originalPath = path.join(originalsDir, originalName);
      const fullPath = path.join(publicDir, "full", `${filename}.webp`);
      const thumbPath = path.join(publicDir, "thumbs", `${filename}.webp`);
      const image = sharp(bytes, { failOn: "error" }).rotate();
      const metadata = await image.metadata();
      if (!metadata.width || !metadata.height) throw new Error("Invalid image dimensions.");
      await copyFile(file, originalPath);
      await image.clone().resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toFile(fullPath);
      await image.clone().resize({ width: 480, height: 640, fit: "inside", withoutEnlargement: true }).webp({ quality: 74, effort: 4 }).toFile(thumbPath);
      const { title, category } = titleAndCategory(path.basename(file));
      const mtime = (await stat(file)).mtime;
      const year = String(mtime.getFullYear());
      pending.push({
        id, title,
        image: `/images/starmist/full/${filename}.webp`,
        thumbnail: `/images/starmist/thumbs/${filename}.webp`,
        original: `original-images/${originalName}`,
        hash, year,
        date: `${year}.${String(mtime.getMonth() + 1).padStart(2, "0")}.${String(mtime.getDate()).padStart(2, "0")}`,
        category, style: "未设置", state: "未设置", clothing: "未设置", location: "未设置",
        canon: category === "Canon", tags: [], description: "",
      });
      knownHashes.add(hash); knownIds.add(id); imported++;
      console.log(`已处理 ${path.basename(file)} → ${id}`);
    } catch (error) {
      failed++;
      console.error(`导入失败 ${file}: ${error.message}`);
    }
  }
  if (pending.length) {
    const merged = await updateGallery(dataFile, current => {
      const hashes = new Set(current.map(record => record.hash).filter(Boolean));
      const ids = new Set(current.map(record => record.id));
      let added = 0, skipped = 0;
      for (const record of pending) {
        if (hashes.has(record.hash)) { skipped++; continue; }
        if (ids.has(record.id)) throw new Error("ID collision; image not imported.");
        current.push(record);
        hashes.add(record.hash); ids.add(record.id); added++;
      }
      return { added, skipped };
    });
    imported = merged.added;
    duplicates += merged.skipped;
  }
  console.log(`完成：新增 ${imported} 张，跳过重复 ${duplicates} 张，失败 ${failed} 张。原图保留在 ${originalsDir}。`);
  if (failed) process.exitCode = 1;
}

main().catch(error => { console.error(error); process.exitCode = 1; });

