"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, LoaderCircle, Plus, Save, X } from "lucide-react";
import type { GalleryCategory, GalleryState, GalleryWork } from "../../src/data/starmist-images";
import "./admin.css";

const api = "http://127.0.0.1:4179";
const categories: GalleryCategory[] = ["Canon", "Story", "Variant", "Archive", "Uncategorized"];
const states: GalleryState[] = ["未设置", "日常", "侦探", "悖论"];
const pageSize = 50;
const parseTags = (text: string) => [...new Set(text.split(/[,，\n]/).map(tag => tag.trim()).filter(Boolean))];

async function request<T>(url: string, method = "GET", payload?: unknown): Promise<T> {
  const response = await fetch(`${api}${url}`, {
    method, cache: "no-store",
    headers: payload ? { "Content-Type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error || "保存失败");
  return result as T;
}

export default function AdminClient() {
  const [works, setWorks] = useState<GalleryWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<"All" | GalleryCategory>("All");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<GalleryWork | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [bulkCategory, setBulkCategory] = useState<"Keep" | GalleryCategory>("Keep");
  const [bulkAdd, setBulkAdd] = useState("");
  const [bulkRemove, setBulkRemove] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    request<GalleryWork[]>("/works").then(setWorks).catch(e => setError(`${e.message}。请用 npm run dev 启动网站。`)).finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => works.filter(work =>
    (filter === "All" || work.category === filter) &&
    (!query || [work.title, work.id, work.style, work.location, ...work.tags].join(" ").toLowerCase().includes(query.toLowerCase()))
  ), [works, filter, query]);
  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pages);
  const shown = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pendingCount = works.filter(work => work.category === "Uncategorized").length;
  const allShownSelected = shown.length > 0 && shown.every(work => selectedIds.has(work.id));

  function choose(work: GalleryWork) { setDraft({ ...work, tags: [...work.tags] }); setTagInput(""); setMessage(""); }
  function toggle(id: string) { setSelectedIds(previous => { const next = new Set(previous); next.has(id) ? next.delete(id) : next.add(id); return next; }); }
  function togglePage() { setSelectedIds(previous => { const next = new Set(previous); for (const work of shown) allShownSelected ? next.delete(work.id) : next.add(work.id); return next; }); }
  function update<K extends keyof GalleryWork>(field: K, value: GalleryWork[K]) { if (draft) setDraft({ ...draft, [field]: value }); }
  function addTag() { if (!draft) return; update("tags", [...new Set([...draft.tags, ...parseTags(tagInput)])]); setTagInput(""); }

  async function saveOne() {
    if (!draft) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const updated = await request<GalleryWork>(`/works/${encodeURIComponent(draft.id)}`, "PATCH", {
        title: draft.title, category: draft.category, state: draft.state, style: draft.style,
        clothing: draft.clothing, location: draft.location, tags: draft.tags, description: draft.description,
      });
      setWorks(previous => previous.map(work => work.id === updated.id ? updated : work));
      setDraft(updated); setMessage("已保存。图库会在刷新页面后显示新信息。");
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  async function saveBatch() {
    if (!selectedIds.size) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const result = await request<{ updated: number }>("/batch", "POST", {
        ids: [...selectedIds], category: bulkCategory === "Keep" ? undefined : bulkCategory,
        addTags: parseTags(bulkAdd), removeTags: parseTags(bulkRemove),
      });
      const refreshed = await request<GalleryWork[]>("/works");
      setWorks(refreshed); setSelectedIds(new Set()); setDraft(null);
      setBulkCategory("Keep"); setBulkAdd(""); setBulkRemove("");
      setMessage(`已批量更新 ${result.updated} 张图片。`);
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  return <main className="admin-root">
    <header className="admin-header"><a href="/"><ArrowLeft size={17} /> 返回网站</a><span>STARMIST / LOCAL ARCHIVE MANAGER</span><span>仅本地开放</span></header>
    <section className="admin-intro"><p>图片整理</p><h1>星雾档案管理</h1><span>共 {works.length} 张 · 待分类 {pendingCount} 张</span></section>
    {loading ? <p className="admin-status"><LoaderCircle className="spin" /> 正在读取档案…</p> : error && !works.length ? <p className="admin-error">{error}</p> : <>
      <div className="admin-toolbar">
        <div className="admin-tabs">{(["All", ...categories] as const).map(item => <button key={item} className={filter === item ? "chosen" : ""} onClick={() => { setFilter(item); setPage(1); }}>{item === "All" ? "全部图片" : item === "Uncategorized" ? `待分类 (${pendingCount})` : item}</button>)}</div>
        <input type="search" placeholder="搜索标题、ID、画风、地点、标签" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} />
      </div>
      {message && <p className="admin-success"><Check size={16} /> {message}</p>}{error && <p className="admin-error">{error}</p>}
      <div className="admin-layout"><section className="admin-list">
        <div className="admin-list-head"><label><input type="checkbox" checked={allShownSelected} onChange={togglePage} /> 选择本页</label><span>显示 {shown.length} / {visible.length} 张</span></div>
        <div className="admin-rows">{shown.map(work => <article key={work.id} className={draft?.id === work.id ? "is-current" : ""}>
          <input type="checkbox" checked={selectedIds.has(work.id)} onChange={() => toggle(work.id)} aria-label={`选择 ${work.title}`} />
          <button type="button" className="admin-row-open" onClick={() => choose(work)}>
            {work.thumbnail || work.image ? <img src={work.thumbnail || work.image || ""} loading="lazy" alt="" /> : <div className="admin-empty-image" />}
            <span><strong>{work.title}</strong><small>{work.id} · {work.category === "Uncategorized" ? "待分类" : work.category} · {work.state}</small></span>
          </button>
        </article>)}</div>
        {!shown.length && <p className="admin-empty">没有符合当前筛选的作品。</p>}
        <div className="admin-pages"><button disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /> 上一页</button><span>{currentPage} / {pages}</span><button disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>下一页 <ChevronRight size={16} /></button></div>
      </section><aside className="admin-editor">{draft ? <>
        <p className="editor-kicker">编辑记录 / {draft.id}</p>
        {draft.thumbnail || draft.image ? <img className="editor-preview" src={draft.thumbnail || draft.image || ""} alt={draft.title} /> : <div className="editor-preview admin-empty-image" />}
        <label>标题<input value={draft.title} onChange={e => update("title", e.target.value)} /></label>
        <div className="admin-field-pair"><label>分类<select value={draft.category} onChange={e => update("category", e.target.value as GalleryCategory)}>{categories.map(item => <option key={item} value={item}>{item === "Uncategorized" ? "待分类" : item}</option>)}</select></label><label>状态<select value={draft.state} onChange={e => update("state", e.target.value as GalleryState)}>{states.map(item => <option key={item}>{item}</option>)}</select></label></div>
        <label>画风<input value={draft.style} onChange={e => update("style", e.target.value)} /></label>
        <label>服装<input value={draft.clothing} onChange={e => update("clothing", e.target.value)} /></label>
        <label>地点<input value={draft.location} onChange={e => update("location", e.target.value)} /></label>
        <label>标签<div className="admin-tags">{draft.tags.map(tag => <button key={tag} onClick={() => update("tags", draft.tags.filter(item => item !== tag))}>#{tag} <X size={12} /></button>)}</div><div className="admin-add-tag"><input placeholder="输入标签，多个用逗号分隔" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} /><button onClick={addTag} aria-label="添加标签"><Plus size={17} /></button></div></label>
        <label>创作说明<textarea rows={5} value={draft.description} onChange={e => update("description", e.target.value)} /></label>
        <button className="admin-primary" disabled={saving} onClick={saveOne}><Save size={16} /> {saving ? "保存中…" : "保存这张图片"}</button>
      </> : <p className="editor-placeholder">从左侧选择一张图片，编辑标题、分类和作品资料。</p>}</aside></div>
      {selectedIds.size > 0 && <section className="admin-bulk"><strong>已选 {selectedIds.size} 张</strong><label>批量分类<select value={bulkCategory} onChange={e => setBulkCategory(e.target.value as "Keep" | GalleryCategory)}><option value="Keep">保持原分类</option>{categories.map(item => <option key={item}>{item}</option>)}</select></label><label>添加标签<input value={bulkAdd} onChange={e => setBulkAdd(e.target.value)} placeholder="多个用逗号分隔" /></label><label>删除标签<input value={bulkRemove} onChange={e => setBulkRemove(e.target.value)} placeholder="多个用逗号分隔" /></label><button disabled={saving} onClick={saveBatch}>应用到所选图片</button><button className="admin-clear" onClick={() => setSelectedIds(new Set())}>清空选择</button></section>}
    </>}
  </main>;
}
