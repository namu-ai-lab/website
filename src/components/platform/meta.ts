import type { Metadata } from "next";
import { platformCopy, type DoorId } from "@/content/platform";
import { isLang, type Lang } from "@/i18n/config";

/** A platform page's metadata: "<page> · Namu <door>", never indexed. */
export async function platformMetadata(params: Promise<{ lang: string }>, door: DoorId, page: (t: (typeof platformCopy)["en"]) => string): Promise<Metadata> {
  const { lang } = await params; const l: Lang = isLang(lang) ? lang : "en";
  const t = platformCopy[l];
  return { title: `${page(t)} · Namu ${t.doors[door]}`, robots: { index: false } };
}
