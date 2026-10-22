"use client";

import { useEffect } from "react";

/* The models sleep when nobody uses them, and the first request after a quiet spell waits 20–30 s while a GPU starts
   and loads the model. So the pages that run the live demos wake them early: at the visitor's first scroll, pointer
   move, touch or key press (bots make none of these), the browser calls GET /api/demo/converse, which sends the
   transcription and voice services a tiny request each and returns at once. By the time someone picks a tab and
   presses play, the models are up. Once per browser tab every four minutes, since a woken model stays up for five
   to ten. */
const KEY = "namu-wake-at", EVERY_MS = 4 * 60_000;
const EVENTS = ["scroll", "pointermove", "touchstart", "keydown"] as const;

export function wakeModels() {
  try {
    const at = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - at < EVERY_MS) return;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch { /* storage blocked: wake anyway; a wake is two tiny requests */ }
  void fetch("/api/demo/converse", { method: "GET", keepalive: true, cache: "no-store" }).catch(() => {});
}

export function useWakeOnFirstTouch() {
  useEffect(() => {
    const go = () => { off(); wakeModels(); };
    const off = () => EVENTS.forEach(e => window.removeEventListener(e, go));
    EVENTS.forEach(e => window.addEventListener(e, go, { passive: true, once: true }));
    return off;
  }, []);
}
