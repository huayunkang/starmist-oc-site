# Starmist Archive / 星雾档案局

用于展示原创 OC「星雾（Starmist）」的角色档案、世界观、案件和多版本作品库。

## 添加图库作品

1. 将图片放入 `public/images/starmist/`。
2. 在 `src/data/starmist-images.ts` 增加一条作品记录。
3. `image` 写为 `/images/starmist/文件名`；如暂时没有图片，填 `null`，页面会显示档案占位图。

页面会自动提供分类、状态筛选、懒加载和作品详情，无须在页面组件里重复写图片资料。

## 本地运行

```bash
npm run dev
npm run build
```

## Cloudflare Pages

导入 GitHub 仓库后，以 `npm run build` 作为构建命令。此项目的构建流程会生成 Cloudflare 兼容产物。
