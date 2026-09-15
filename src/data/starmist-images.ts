import works from "./starmist-images.json";

export type GalleryCategory = "Canon" | "Story" | "Variant" | "Archive" | "Uncategorized";
export type GalleryState = "日常" | "侦探" | "悖论" | "未设置";
export type GalleryWork = {
  id: string;
  title: string;
  image: string | null;
  thumbnail?: string | null;
  original?: string;
  hash?: string;
  year: string;
  date: string;
  category: GalleryCategory;
  style: string;
  state: GalleryState;
  clothing: string;
  location: string;
  canon: boolean;
  tags: string[];
  description: string;
};

// The import script and local admin write this JSON file. All pages read it here.
export const galleryWorks: GalleryWork[] = works as GalleryWork[];
