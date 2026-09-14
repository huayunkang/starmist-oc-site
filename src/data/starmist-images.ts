export type GalleryCategory = "Canon" | "Story" | "Variant" | "Archive";
export type GalleryWork = { id:string; title:string; image:string|null; year:string; date:string; category:GalleryCategory; style:string; state:"日常"|"侦探"|"悖论"; clothing:string; location:string; canon:boolean; tags:string[]; description:string };

// 新增作品：把图片放入 public/images/starmist/，把 image 写成 /images/starmist/文件名。
// image 为 null 时会显示档案占位图，方便先录入大量历史作品再补图。
export const galleryWorks: GalleryWork[] = [
  {id:"SM-C-001",title:"正式设定 · 侦探状态",image:null,year:"2026",date:"2026.09",category:"Canon",style:"官方设定图",state:"侦探",clothing:"侦探帽与披风",location:"格雷洛克",canon:true,tags:["主设定","Logic Eye","侦探服"],description:"白色独角兽小马，深蓝紫星空鬃毛带金丝；右前蹄装备紫宝石逻辑装置。"},
  {id:"SM-C-002",title:"正式设定 · 日常状态",image:null,year:"2026",date:"2026.09",category:"Canon",style:"官方设定图",state:"日常",clothing:"日常短披风",location:"格雷洛克",canon:true,tags:["主设定","日常","白色独角兽"],description:"适用于非案件时段的星雾官方状态；保留角色核心识别特征。"},
  {id:"SM-S-001",title:"倒悬星图",image:null,year:"2026",date:"2026.09",category:"Story",style:"梦幻星图插画",state:"侦探",clothing:"侦探披风",location:"天文局旧址",canon:false,tags:["星图","案件插图","夜晚"],description:"一张以倒悬星空与校正中的天文局为主体的故事插图。"},
  {id:"SM-S-002",title:"静止的雨",image:null,year:"2026",date:"2026.09",category:"Story",style:"雨夜电影感",state:"侦探",clothing:"侦探帽与披风",location:"第七码头",canon:false,tags:["GLK-001","雨夜","码头"],description:"案件 GLK-001 的现场记录：雨滴在午夜悬停，而因果链被从世界里抹去。"},
  {id:"SM-S-003",title:"雾钟巷的余光",image:null,year:"2026",date:"2026.08",category:"Story",style:"哥特动画",state:"日常",clothing:"短风衣",location:"雾钟巷",canon:false,tags:["城市","雾","世界观"],description:"雾钟巷短暂出现于地图上的那一分钟。"},
  {id:"SM-V-001",title:"月台与黄铜",image:null,year:"2026",date:"2026.09",category:"Variant",style:"蒸汽朋克插画",state:"侦探",clothing:"长风衣",location:"旧火车站",canon:false,tags:["蒸汽朋克","黄铜","实验"],description:"将格雷洛克的黄铜机械感推至更高密度的实验版本。"},
  {id:"SM-V-002",title:"紫外线索",image:null,year:"2026",date:"2026.09",category:"Variant",style:"赛博黑色电影",state:"悖论",clothing:"机能披风",location:"未知城区",canon:false,tags:["赛博","悖论","AU"],description:"在非主时间线中，Logic Eye 成为一座城市追踪星雾的信号。"},
  {id:"SM-V-003",title:"咖啡馆笔录",image:null,year:"2026",date:"2026.08",category:"Variant",style:"暖调动画",state:"日常",clothing:"无帽日常装",location:"北街咖啡馆",canon:false,tags:["日常","咖啡馆","暖光"],description:"雨停后的片刻，侦探允许自己整理一页尚未命名的笔录。"},
  {id:"SM-A-001",title:"第一次的星雾",image:null,year:"2026",date:"2026.06",category:"Archive",style:"早期概念草图",state:"日常",clothing:"早期侦探服",location:"未定",canon:false,tags:["早期设计","草图","Archive"],description:"最初的角色草图。装置位置与标志结构尚未确定，保留作设计演化记录。"},
  {id:"SM-A-002",title:"错误的 Logic Eye",image:null,year:"2026",date:"2026.07",category:"Archive",style:"实验稿",state:"悖论",clothing:"实验披风",location:"未定",canon:false,tags:["废案","标志实验","Archive"],description:"一份没有进入正式设定的标志实验稿；其错误结构被转化为 GLK-001 的线索。"},
  {id:"SM-A-003",title:"未编号的夜行者",image:null,year:"2026",date:"2026.07",category:"Archive",style:"黑白线稿",state:"侦探",clothing:"早期帽子",location:"格雷洛克",canon:false,tags:["线稿","早期设计","夜行"],description:"在正式世界观出现前，用于测试侦探轮廓与帽子比例的线稿。"}
];
