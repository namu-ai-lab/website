"use client";

import { useEffect, useState, type ReactNode } from "react";

/** A download link for a file made in the browser; its URL is made and released with the file. */
export function FileLink({ blob, name, className, children }: { blob: Blob; name: string; className?: string; children: ReactNode }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const u = URL.createObjectURL(blob); setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return <a className={className} href={url} download={name} aria-disabled={!url || undefined}>{children}</a>;
}
