# Starmist Archive / 星雾档案局

星雾的官方角色档案、多版本画廊、格雷洛克世界观与案件记录。网站使用 React、TypeScript 和 Vite/Vinext。

## 一次导入一批图片

1. 把 JPG、JPEG、PNG 或 WEBP 图片拖进项目根目录的 `import-images/`。可以直接放入子文件夹。
2. 可选：用文件名前缀自动分类，例如 `canon_星雾侦探.png`、`story_静止的雨.jpg`、`variant_赛博星雾.webp`、`archive_初稿.jpeg`。没有这四种前缀的图片会进入“待分类”。
3. 在项目目录运行：

   ```bash
   npm run import-images
   ```

4. 导入完成后，运行 `npm run dev`，在本机打开网站的 `/admin` 页面，整理待分类图片、标题、状态、画风、服装、地点、标签和说明。点击“保存这张图片”；多选后也可批量设置分类和添加或删除标签。
5. 刷新公开网站的“图像档案”页面。新增图片会自动出现，无须编辑页面代码。

导入器用图片内容的 SHA-256 hash 检测重复。再次运行命令会跳过已导入图片；重复文件不会增加第二条作品记录。文件名可以重复，ID 和网站文件名由内容 hash 唯一生成。

原始文件仍留在 `import-images/`，另有一份原图备份放入 `original-images/`；这两个目录不会上传到 GitHub。网站用的压缩 WebP 放在 `public/images/starmist/full/`，图库用的小缩略图放在 `public/images/starmist/thumbs/`。作品信息集中保存在 `src/data/starmist-images.json`，可以直接修改，也可以使用 `/admin` 页面修改。

`import-images/` 中的文件不会自动删除。导入完成后可以自行将那批文件移出，以保持待导入目录整洁；重复导入不会覆盖作品信息。

## 本地运行

先安装依赖，然后启动网站及仅在本机监听的整理接口：

```bash
npm install
npm run dev
```

网站页面在 `/`；本地管理页在 `/admin`。生产版本的 `/admin` 返回 404，也不会启动保存作品资料的本地接口。上线时只需提交网站 WebP 版本和数据 JSON，不需提交原图。

验证生产构建：

```bash
npm run build
```

公开图库每页只渲染 36 张图片，并优先加载 WebP 缩略图；点开详情时才加载较大的 WebP。即使导入几百或上千张，也不会在第一次打开页面时同时请求所有大图。

## 发布

网站源代码保存在 GitHub 的 `starmist-oc-site` 仓库。公开图库和数据文件变更提交后，需要重新发布网站，线上访客才会看到新增图片。本地 `/admin` 保存不会直接改动线上版本。
