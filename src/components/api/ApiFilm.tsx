"use client";

import { useEffect, useRef } from "react";
import { FILM } from "@/content/api";

/* The film behind /api's hero: muted, played once, resting on its last frame. Under reduced motion it stays on the
   poster. It is decoration (aria-hidden); the page says nothing about the people in it. */
export function ApiFilm() {
  const v = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = v.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    void el.play().catch(() => { /* autoplay refused: the poster stays */ });
  }, []);
  return (
    <video ref={v} className="ax-film" muted playsInline preload="auto" poster={FILM.poster} aria-hidden="true" tabIndex={-1}>
      <source src={FILM.webm} type="video/webm" />
      <source src={FILM.mp4} type="video/mp4" />
    </video>
  );
}
