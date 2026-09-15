import { createServer } from "node:http";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const file = process.env.STARMIST_ADMIN_DATA_FILE || path.join(process.cwd(), "src", "data", "starmist-images.json");
const port = Number(process.env.STARMIST_ADMIN_PORT || 4179);
const categories = new Set(["Canon", "Story", "Variant", "Archive", "Uncategorized"]);
const states = new Set(["日常", "侦探", "悖论", "未设置"]);
const editable = ["title", "category", "state", "style", "clothing", "location", "tags", "description"];
let writeQueue = Promise.resolve();

async function readWorks() { return JSON.parse(await readFile(file, "utf8")); }
async function saveWorks(works) {
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(works, null, 2)}\n`, "utf8");
  await rename(temporary, file);
}
function validateUpdate(update) {
  const clean = {};
  for (const key of editable) {
    if (!(key in update)) continue;
    const value = update[key];
    if (key === "category") {
      if (!categories.has(value)) throw new Error("无效分类");
      clean.category = value;
    } else if (key === "state") {
      if (!states.has(value)) throw new Error("无效状态");
      clean.state = value;
    } else if (key === "tags") {
      if (!Array.isArray(value) || value.some(tag => typeof tag !== "string")) throw new Error("标签格式无效");
      clean.tags = [...new Set(value.map(tag => tag.trim()).filter(Boolean))].slice(0, 40);
    } else {
      if (typeof value !== "string" || value.length > (key === "description" ? 5000 : 200)) throw new Error(`字段 ${key} 无效`);
      clean[key] = value.trim();
    }
  }
  return clean;
}
async function body(request) {
  const chunks = []; let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > 2_000_000) throw new Error("请求过大");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
function reply(response, status, data) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(data));
}

const server = createServer(async (request, response) => {
  const origin = request.headers.origin;
  if (origin) {
    try {
      const url = new URL(origin);
      if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return reply(response, 403, { error: "仅本地管理页面可访问" });
      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Vary", "Origin");
      response.setHeader("Access-Control-Allow-Methods", "GET, PATCH, POST, OPTIONS");
      response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    } catch { return reply(response, 403, { error: "无效来源" }); }
  }
  if (request.method === "OPTIONS") return reply(response, 200, {});
  const url = new URL(request.url, `http://127.0.0.1:${port}`);
  try {
    if (request.method === "GET" && url.pathname === "/works") return reply(response, 200, await readWorks());
    if (request.method === "PATCH" && url.pathname.startsWith("/works/")) {
      const id = decodeURIComponent(url.pathname.slice(7));
      const update = validateUpdate(await body(request));
      const task = writeQueue.then(async () => {
        const works = await readWorks();
        const index = works.findIndex(work => work.id === id);
        if (index === -1) throw new Error("找不到这条作品记录");
        works[index] = { ...works[index], ...update };
        works[index].canon = works[index].category === "Canon";
        await saveWorks(works);
        return works[index];
      });
      writeQueue = task.catch(() => {});
      return reply(response, 200, await task);
    }
    if (request.method === "POST" && url.pathname === "/batch") {
      const input = await body(request);
      if (!Array.isArray(input.ids) || !input.ids.length || input.ids.length > 2000 || input.ids.some(id => typeof id !== "string")) throw new Error("无效作品选择");
      if (input.category !== undefined && !categories.has(input.category)) throw new Error("无效分类");
      if (!Array.isArray(input.addTags) || input.addTags.some(tag => typeof tag !== "string")) throw new Error("无效标签");
      if (!Array.isArray(input.removeTags) || input.removeTags.some(tag => typeof tag !== "string")) throw new Error("无效标签");
      const ids = new Set(input.ids);
      const add = input.addTags.map(tag => tag.trim()).filter(Boolean);
      const remove = new Set(input.removeTags.map(tag => tag.trim()).filter(Boolean));
      const task = writeQueue.then(async () => {
        const works = await readWorks(); let updated = 0;
        for (const work of works) {
          if (!ids.has(work.id)) continue;
          if (input.category) { work.category = input.category; work.canon = input.category === "Canon"; }
          work.tags = [...new Set([...work.tags.filter(tag => !remove.has(tag)), ...add])].slice(0, 40);
          updated++;
        }
        await saveWorks(works);
        return { updated };
      });
      writeQueue = task.catch(() => {});
      return reply(response, 200, await task);
    }
    return reply(response, 404, { error: "未知管理请求" });
  } catch (error) { return reply(response, 400, { error: error.message }); }
});
server.listen(port, "127.0.0.1", () => console.log(`本地图片整理接口已启动：127.0.0.1:${port}`));
