import { after, type NextRequest } from "next/server";
import { setting } from "@/lib/env";
import { apiBase } from "@/lib/public-config";
import { demoVisitor, fail, sameOrigin } from "@/lib/http";
import { isPersona } from "@/lib/voices";

/* The home page's live conversation with Aïr. Aïr is a chain, not one speech-to-speech model: Tatsuniya writes down
   what was said, a language model writes the reply (Aïr's agent service, Gemini through OpenRouter), and Tafiya speaks
   it. The gateway's /v1/converse runs the chain in one call and answers when the whole reply has been spoken, which
   takes as long as the reply is long. This route runs the same chain in steps and streams each as it lands, so the
   page can show what it heard after a second or two and start playing the reply's first sentence while the rest is
   still being spoken.

   GET wakes the models: the transcription and voice services sleep when nobody uses them and take about twenty
   seconds to start, so the page calls this as the call opens, while Aïr's recorded welcome plays.

   POST takes one turn of the visitor's speech (WAV) and answers in lines of JSON:
     {"t":"heard","text"}   what Tatsuniya heard
     {"t":"reply","text"}   what Aïr will say
     {"t":"audio","i","last","b64"}   the reply spoken, first sentence first
     {"t":"error","status"} 422 when nothing was heard, 429 at the demo's limit, otherwise a failure
   Transcription and speech go through the gateway with the server-held demo key, so the demo's per-visitor limits
   apply; only the text step calls Aïr's agent service directly, and only after the gateway has accepted the turn.
   If that step fails, the turn falls back to the gateway's own /v1/converse.

   Each turn stands alone: Aïr answers this turn's words only, and no conversation is kept, here or by the agent (no
   session id is sent). The heard text goes to the language model provider to write the reply. ?persona= must be one
   the API serves (lib/voices); any other is a 400, never another voice. */
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const AGENT = (setting("NAMU_AGENT_URL") ?? "https://namu-ai-lab--namu-agent-api.modal.run").replace(/\/+$/, "");
const MAX_AUDIO_BYTES = 2 * 1024 * 1024;        // 15 s of 16 kHz WAV is under 500 KB

/* Modal proxy auth, for when the model services stop answering the open internet (set both in Vercel) */
const agentHeaders = (): Record<string, string> => {
  const k = setting("MODAL_PROXY_KEY"), s = setting("MODAL_PROXY_SECRET");
  return k && s ? { "Modal-Key": k, "Modal-Secret": s } : {};
};

/* 0.4 s of silence at 16 kHz: enough for Tatsuniya to load, nothing for it to hear */
function silence(): ArrayBuffer {
  const n = 6400, b = new ArrayBuffer(44 + n * 2), v = new DataView(b);
  const s = (o: number, t: string) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  s(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); s(8, "WAVE"); s(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); s(36, "data"); v.setUint32(40, n * 2, true);
  return b;
}

/* The reply's first sentence goes alone so it can play soonest; the rest goes in one request (each request counts
   against the visitor's demo limit). A first sentence shorter than four words takes the next one with it; one longer
   than twelve is cut where a speaker would pause, at its first comma or before its first joining word (domin,
   saboda, kuma, amma, don, sannan) after the fifth word, since the voice takes longer the more it has to say. */
const JOIN = /^(domin|saboda|kuma|amma|don|sannan)$/i;
function split(reply: string): string[] {
  const parts = reply.match(/[^.!?…]+[.!?…]+["”’)]*\s*|[^.!?…]+$/g)?.map(p => p.trim()).filter(Boolean) ?? [reply];
  let first = parts.shift() ?? "";
  while (parts.length && first.split(/\s+/).length < 4) first += " " + parts.shift();
  const w = first.split(/\s+/);
  if (w.length > 12) {
    for (let i = 5; i < w.length - 4; i++) {
      if (/[,;:]$/.test(w[i - 1]) || JOIN.test(w[i])) {
        parts.unshift(w.slice(i).join(" "));
        first = w.slice(0, i).join(" ").replace(/[,;:]?$/, ",");
        break;
      }
    }
  }
  return parts.length ? [first, parts.join(" ")] : [first];
}

export async function GET(req: NextRequest) {
  if (!sameOrigin(req) && req.headers.get("sec-fetch-site") !== "same-origin") return fail(403, "bad_origin", "The demo runs from the Namu site only.");
  const key = setting("NAMU_DEMO_KEY");
  if (!key) return fail(503, "demo_unavailable", "The live demo is not configured.");
  const voice = req.nextUrl.searchParams.get("persona") || "nadia";
  if (!isPersona(voice)) return fail(400, "unknown_persona", "Unknown persona. Aïr speaks as nadia.");
  const h = { Authorization: `Bearer ${key}`, "X-Namu-Client-IP": demoVisitor(req) };
  const quiet = (p: Promise<Response>) => p.then(r => r.body?.cancel()).catch(() => {});
  after(() => Promise.all([
    quiet(fetch(`${apiBase}/v1/transcribe`, { method: "POST", headers: { ...h, "Content-Type": "application/octet-stream" }, body: silence(), signal: AbortSignal.timeout(100_000) })),
    quiet(fetch(`${apiBase}/v1/speech`, { method: "POST", headers: { ...h, "Content-Type": "application/json" }, body: JSON.stringify({ text: "Sannu.", voice }), signal: AbortSignal.timeout(100_000) })),
    quiet(fetch(`${AGENT}/v1/health`, { headers: agentHeaders(), signal: AbortSignal.timeout(60_000) })),
  ]));
  return new Response(null, { status: 202, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, "bad_origin", "The demo runs from the Namu site only.");
  const key = setting("NAMU_DEMO_KEY");
  if (!key) return fail(503, "demo_unavailable", "The live demo is not configured.");
  const persona = req.nextUrl.searchParams.get("persona") || "nadia";
  if (!isPersona(persona)) return fail(400, "unknown_persona", "Unknown persona. Aïr speaks as nadia.");
  if (Number(req.headers.get("content-length") ?? "0") > MAX_AUDIO_BYTES) return fail(413, "payload_too_large", "Keep the turn short.");
  const audio = await req.arrayBuffer();
  if (!audio.byteLength || audio.byteLength > MAX_AUDIO_BYTES) return fail(413, "payload_too_large", "Keep the turn short.");

  const auth = { Authorization: `Bearer ${key}`, "X-Namu-Client-IP": demoVisitor(req) };
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctl) {
      const send = (o: object) => { try { ctl.enqueue(enc.encode(JSON.stringify(o) + "\n")); } catch { /* the caller hung up */ } };
      const b64 = (b: ArrayBuffer) => Buffer.from(b).toString("base64");
      try {
        /* 1. what was said */
        const tr = await fetch(`${apiBase}/v1/transcribe`, { method: "POST", headers: { ...auth, "Content-Type": "application/octet-stream" }, body: audio, signal: AbortSignal.timeout(100_000) });
        if (!tr.ok) { send({ t: "error", status: tr.status }); return; }
        const heard = String(((await tr.json()) as { text?: string }).text ?? "").trim();
        if (!heard) { send({ t: "error", status: 422 }); return; }
        send({ t: "heard", text: heard });

        /* 2. what Aïr says back, to this turn alone */
        let reply = "";
        try {
          const ch = await fetch(`${AGENT}/v1/chat`, { method: "POST", headers: { ...agentHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ text: heard, persona }), signal: AbortSignal.timeout(40_000) });
          if (ch.ok) reply = String(((await ch.json()) as { reply?: string }).reply ?? "").trim();
        } catch { reply = ""; }
        if (!reply) {
          /* the agent could not be reached directly: the gateway runs the whole turn instead */
          const form = new FormData();
          form.append("file", new Blob([audio], { type: "audio/wav" }), "turn.wav");
          form.append("persona", persona);
          const cv = await fetch(`${apiBase}/v1/converse`, { method: "POST", headers: auth, body: form, signal: AbortSignal.timeout(110_000) });
          if (!cv.ok) { send({ t: "error", status: cv.status }); return; }
          const j = (await cv.json()) as { reply?: string; audio?: string };
          send({ t: "reply", text: j.reply ?? "" });
          if (j.audio) send({ t: "audio", i: 0, last: true, b64: j.audio });
          return;
        }
        send({ t: "reply", text: reply });

        /* 3. the reply spoken: both parts start at once, and are sent in order */
        const parts = split(reply);
        const speak = (text: string) => fetch(`${apiBase}/v1/speech`, { method: "POST", headers: { ...auth, "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice: persona }), signal: AbortSignal.timeout(100_000) });
        const jobs = parts.map(speak);
        for (let i = 0; i < jobs.length; i++) {
          const r = await jobs[i];
          if (!r.ok) { send({ t: "error", status: r.status }); return; }
          send({ t: "audio", i, last: i === jobs.length - 1, b64: b64(await r.arrayBuffer()) });
        }
      } catch {
        send({ t: "error", status: 504 });
      } finally {
        try { ctl.close(); } catch { /* already closed */ }
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}
