import type { Metadata } from "next";
import "./globals.css";
import "./gallery-enhancements.css";
export const metadata: Metadata = { title:"Starmist Archive | 星雾档案局", description:"星雾 Starmist 的官方角色档案、多版本画廊与格雷洛克世界观记录。", keywords:["Starmist","星雾","OC","GrelocK"], icons:{icon:"/favicon.svg"} };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="zh-CN"><body>{children}</body></html>; }
