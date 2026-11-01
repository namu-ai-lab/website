"use client";

import { useEffect, useRef, type ComponentPropsWithoutRef, type ElementType } from "react";

/* A row that scrolls sideways on a small screen (the console's pages, an agent's tabs): it opens with the current
   item in view, and fades at the side where there is more, so a thumb knows it can scroll. Nothing changes where
   the row fits. */
export function ScrollRow<T extends ElementType = "nav">({ as, className, children, ...rest }: { as?: T } & ComponentPropsWithoutRef<T>) {
  const Tag = (as ?? "nav") as ElementType;
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const row = ref.current;
    if (!row) return;
    const here = row.querySelector<HTMLElement>('[aria-current="page"], [aria-selected="true"]');
    if (here && row.scrollWidth > row.clientWidth) row.scrollLeft = here.offsetLeft - (row.clientWidth - here.offsetWidth) / 2;
    const mark = () => {
      row.dataset.left = String(row.scrollLeft > 4);
      row.dataset.right = String(row.scrollLeft + row.clientWidth < row.scrollWidth - 4);
    };
    mark();
    row.addEventListener("scroll", mark, { passive: true });
    window.addEventListener("resize", mark);
    return () => { row.removeEventListener("scroll", mark); window.removeEventListener("resize", mark); };
  }, []);
  return <Tag ref={ref} className={`scroll-row${className ? ` ${className}` : ""}`} {...rest}>{children}</Tag>;
}
