"use client";

/* How far into a research post a reader got: post_read once at half the article and once at its end (lib/analytics).
   Sits as an empty marker at the end of the article and measures the article it closes. */
import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

export function ReadDepth({ post }: { post: string }) {
  const mark = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const article = mark.current?.closest("article");
    if (!article) return;
    const seen = new Set<"half" | "end">();
    let raf = 0;
    const measure = () => {
      raf = 0;
      const r = article.getBoundingClientRect();
      const read = (window.innerHeight - r.top) / Math.max(r.height, 1);    // the share of the article scrolled into view
      for (const [depth, at] of [["half", .5], ["end", .92]] as const)
        if (read >= at && !seen.has(depth)) { seen.add(depth); track("post_read", { post, depth }); }
      if (seen.size === 2) window.removeEventListener("scroll", onScroll);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, [post]);
  return <span ref={mark} hidden />;
}
