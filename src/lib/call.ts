/* A live call with Aïr in the browser, hands-free like a spoken assistant: Aïr greets the caller, listens, notices
   when they have finished speaking, answers aloud, and listens again, until the call ends. Client only.

   The microphone runs through an AudioWorklet that hands over about 20 ms at a time. Each piece's loudness is
   compared with a running estimate of the room's noise: the turn starts after 60 ms above it (with the 300 ms
   before kept, so the first syllable is not lost) and ends after 750 ms of quiet, or at 15 s. The turn goes to
   /api/demo/converse as 16 kHz WAV and the answer streams back in steps: what was heard, the reply's words, then
   its sound, first sentence first.

   Aïr takes a few seconds to answer (transcription, then the reply, then the voice), so the gap is filled the way a
   person fills it, with short recorded Hausa phrases in the same voice chosen from what was heard: a question gets
   "Tambaya mai kyau." and a statement "To, na ji."; a greeting gets nothing, since the answer to it comes quickly;
   "Bari in duba." and "Kusan na gama." follow only if the wait goes on. The call opens with a recorded welcome,
   which also covers the time the models take to wake. The caller can talk over Aïr, or tap, to cut it short. */

export type Persona = "nadia" | "salim";
export type CallState = "connecting" | "listening" | "hearing" | "thinking" | "speaking" | "ended";
export type CallProblem = "mic" | "limit" | "unavailable" | "failed";
export type CallEvents = { state(s: CallState): void; heard?(text: string): void; reply?(text: string): void; problem(p: CallProblem): void };

const LINES = ["hello", "ack1", "ack2", "ack3", "question", "think1", "think2", "think3", "almost", "unheard", "limit", "error"] as const;
type Line = (typeof LINES)[number];

/* The microphone tap, shared with the home playground's recorder: hands over 1,024 samples at a time. */
export const TAP = `class Tap extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(1024); this.n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) for (let i = 0; i < ch.length; i++) { this.buf[this.n++] = ch[i]; if (this.n === 1024) { this.port.postMessage(this.buf.slice(0)); this.n = 0; } }
    return true;
  }
}
registerProcessor("namu-tap", Tap);`;

/* question words, in the spellings Tatsuniya writes (hooked letters optional) */
const QUESTION = /\?\s*$|(^|\s)(shin|menene|mene ne|me ye|me ya|me za|wane|wace|wa[dɗ]anne|yaya|yaushe|nawa|don me|saboda me|a ina|ina ne|ina za)(\s|$)/i;
const GREETING = /^(\s*(sannu|barka|ina kwana|ina wuni|ina yini|salamu|assalamu|yaya dai|lafiya))/i;

const START = 0.015, STOP = 0.008, BARGE = 0.045;   // loudness floors, before the room's noise raises them
const QUIET_MS = 750, MAX_MS = 15000, MIN_MS = 350, IDLE_MS = 45000;

export class AirCall {
  private ctx: AudioContext;
  private out: GainNode;
  private analyser: AnalyserNode;
  private wave = new Float32Array(512);
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;
  private clips = new Map<Line, AudioBuffer>();
  private src: AudioBufferSourceNode | null = null;
  private chain: Promise<void> = Promise.resolve();
  private turn = 0;                   // bumps whenever playback or a request should be abandoned
  private state: CallState | "idle" = "idle";   // idle until start(), so its first set("connecting") is reported
  private sid = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
  private abort: AbortController | null = null;
  private raf = 0;
  private timers: number[] = [];
  private floor = 0.004;
  private above = 0;
  private quietMs = 0;
  private spokenMs = 0;
  private preroll: Float32Array[] = [];
  private speech: Float32Array[] = [];
  private mic = 0;
  private lastSpeech = performance.now();
  private replyStarted = false;
  private fillers = 0;
  private fails = 0;
  private rotate = { ack: 0, think: 0 };

  constructor(private persona: Persona, private on: CallEvents, private amp: { current: number }, private still = false) {
    /* made inside the tap that starts the call, so the browser lets it play */
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    void this.ctx.resume();
    this.out = this.ctx.createGain();
    this.analyser = this.ctx.createAnalyser(); this.analyser.fftSize = 512;
    this.out.connect(this.analyser); this.analyser.connect(this.ctx.destination);
  }

  async start() {
    this.set("connecting");
    /* wake the models now; they take about twenty seconds from cold, which the welcome covers */
    void fetch(`/api/demo/converse?persona=${this.persona}`, { cache: "no-store" }).then(r => { if (r.status === 503) this.fail("unavailable"); }).catch(() => {});
    const clips = this.load();
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
    } catch { this.fail("mic"); return; }
    if (this.over) { this.release(); return; }
    await this.ctx.resume().catch(() => {});      // iOS pauses the context while it switches to the microphone
    try {
      await this.ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([TAP], { type: "application/javascript" })));
      const node = (this.node = new AudioWorkletNode(this.ctx, "namu-tap"));
      const mute = this.ctx.createGain(); mute.gain.value = 0;
      this.ctx.createMediaStreamSource(this.stream).connect(node); node.connect(mute); mute.connect(this.ctx.destination);
      node.port.onmessage = e => this.hear(e.data as Float32Array);
    } catch { this.fail("failed"); return; }
    this.raf = requestAnimationFrame(this.meter);
    await clips;
    if (this.over) return;
    const t = this.turn;
    await this.say("hello");
    if (this.over || t !== this.turn) return;
    this.listen();
  }

  /** Cut Aïr short and listen. */
  interrupt() { if (this.state === "speaking" || this.state === "connecting") { this.hush(); this.listen(); } }

  end() {
    if (this.over) return;
    this.hush(); this.abort?.abort(); this.set("ended"); this.release();
  }

  /* ---- listening */
  private hear(x: Float32Array) {
    if (this.over) return;
    let sum = 0; for (let i = 0; i < x.length; i++) sum += x[i] * x[i];
    const rms = Math.sqrt(sum / x.length), ms = (x.length / this.ctx.sampleRate) * 1000;
    this.mic = Math.min(1, rms * 9);
    const capturing = this.state === "hearing";
    if (!capturing) this.floor = rms < this.floor ? this.floor * 0.9 + rms * 0.1 : this.floor * 0.997 + rms * 0.003;
    const start = Math.max(START, this.floor * 3.5), stop = Math.max(STOP, this.floor * 2);

    if (this.state === "listening") {
      this.preroll.push(x); if (this.preroll.length > 15) this.preroll.shift();
      this.above = rms > start ? this.above + 1 : 0;
      if (this.above >= 3) this.begin();
      else if (performance.now() - this.lastSpeech > IDLE_MS) this.end();     // nobody there: hang up
    } else if (capturing) {
      this.speech.push(x); this.spokenMs += ms;
      this.quietMs = rms < stop ? this.quietMs + ms : 0;
      if (this.quietMs >= QUIET_MS || this.spokenMs >= MAX_MS) this.finish();
    } else if (this.state === "speaking") {
      /* talking over Aïr: louder than its own voice could leak through the echo cancelling */
      this.preroll.push(x); if (this.preroll.length > 15) this.preroll.shift();
      this.above = rms > Math.max(BARGE, this.floor * 6) ? this.above + 1 : 0;
      if (this.above >= 8) { this.hush(); this.begin(); }
    }
  }
  private listen() { this.preroll = []; this.above = 0; this.lastSpeech = performance.now(); this.set("listening"); }
  private begin() {
    this.speech = [...this.preroll]; this.preroll = []; this.quietMs = 0; this.spokenMs = 0; this.above = 0;
    this.lastSpeech = performance.now(); this.set("hearing");
  }
  private finish() {
    const voiced = this.spokenMs - this.quietMs;
    if (voiced < MIN_MS) { this.listen(); return; }           // a cough, a door
    const keep = Math.max(0, this.speech.length - Math.floor((this.quietMs - 200) / ((1024 / this.ctx.sampleRate) * 1000)));
    void this.ask(wav16k(this.speech.slice(0, keep), this.ctx.sampleRate));
  }

  /* ---- one turn */
  private async ask(audio: ArrayBuffer) {
    const t = ++this.turn;
    this.set("thinking"); this.replyStarted = false; this.fillers = 0;
    const t0 = performance.now();
    let kind: "question" | "greeting" | "statement" | null = null;
    /* the first filler waits for what was heard, up to 1.4 s, then goes with a plain acknowledgement */
    const first = () => {
      if (t !== this.turn || this.fillers) return;
      if (kind === "greeting") { this.fillers++; return; }
      this.filler(t, kind === "question" ? "question" : this.next("ack", ["ack1", "ack2", "ack3"]));
    };
    this.later(first, 1400);
    this.later(() => this.filler(t, this.next("think", ["think1", "think2"])), 4500);
    this.later(() => this.filler(t, "think3"), 9000);
    this.later(() => this.filler(t, "almost"), 14000);

    this.abort = new AbortController();
    let status = 0;
    try {
      const res = await fetch(`/api/demo/converse?persona=${this.persona}&sid=${this.sid}`, { method: "POST", body: audio, headers: { "Content-Type": "audio/wav" }, signal: this.abort.signal });
      if (!res.ok || !res.body) status = res.status || 500;
      else {
        const reader = res.body.getReader(), dec = new TextDecoder();
        let buf = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let nl;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
            if (!line || t !== this.turn) continue;
            const m = JSON.parse(line) as { t: string; text?: string; b64?: string; status?: number };
            if (m.t === "heard") {
              this.on.heard?.(m.text ?? "");
              kind = GREETING.test(m.text ?? "") ? "greeting" : QUESTION.test(m.text ?? "") ? "question" : "statement";
              if (performance.now() - t0 < 1400) first();
            } else if (m.t === "reply") this.on.reply?.(m.text ?? "");
            else if (m.t === "audio" && m.b64) await this.reply(t, m.b64);
            else if (m.t === "error") status = m.status ?? 500;
          }
        }
        if (!status && t === this.turn) {
          await this.chain;
          if (t === this.turn && this.state !== "ended") { this.fails = 0; this.listen(); }
          return;
        }
      }
    } catch {
      if (t !== this.turn || this.over) return;
      status = 504;
    }
    if (t !== this.turn || this.over) return;
    this.clear();
    await this.chain;
    if (status === 422) { await this.say("unheard"); this.listen(); }
    else if (status === 429) { await this.say("limit"); this.fail("limit"); }
    else if (status === 503 || status === 404) this.fail("unavailable");
    else if (++this.fails >= 2) { await this.say("error"); this.fail("failed"); }
    else { await this.say("error"); this.listen(); }
  }

  private async reply(t: number, b64: string) {
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    let buf: AudioBuffer;
    try { buf = await this.ctx.decodeAudioData(bytes.buffer); } catch { return; }
    if (t !== this.turn) return;
    if (!this.replyStarted) { this.replyStarted = true; this.clear(); }
    this.chain = this.chain.then(async () => {
      if (t !== this.turn || this.over) return;
      this.set("speaking");
      await this.play(buf);
    });
  }

  /* ---- sound */
  private filler(t: number, line: Line) {
    if (t !== this.turn || this.replyStarted || this.src || this.state !== "thinking" || this.fillers >= 4) return;
    const b = this.clips.get(line); if (!b) return;
    this.fillers++;
    this.chain = this.chain.then(() => (t === this.turn && !this.replyStarted ? this.play(b) : undefined));
  }
  private say(line: Line): Promise<void> {
    const b = this.clips.get(line); if (!b) return Promise.resolve();
    const t = this.turn;
    this.chain = this.chain.then(() => (t === this.turn && this.state !== "ended" ? this.play(b) : undefined));
    return this.chain;
  }
  private play(b: AudioBuffer): Promise<void> {
    return new Promise(res => {
      const s = this.ctx.createBufferSource(); s.buffer = b; s.connect(this.out);
      s.onended = () => { if (this.src === s) this.src = null; res(); };
      this.src = s; s.start();
    });
  }
  private hush() {
    this.turn++; this.clear(); this.abort?.abort(); this.abort = null;
    try { this.src?.stop(); } catch { /* already stopped */ }
    this.src = null; this.chain = Promise.resolve();
  }
  private next(k: "ack" | "think", lines: Line[]) { const l = lines[this.rotate[k] % lines.length]; this.rotate[k]++; return l; }
  private later(f: () => void, ms: number) { this.timers.push(window.setTimeout(f, ms)); }
  private clear() { this.timers.forEach(clearTimeout); this.timers = []; }

  private async load() {
    await Promise.all(LINES.map(async l => {
      try {
        const r = await fetch(`/converse/${this.persona}/${l}.m4a`);
        if (r.ok) this.clips.set(l, await this.ctx.decodeAudioData(await r.arrayBuffer()));
      } catch { /* a missing phrase is skipped */ }
    }));
  }

  /* the orb moves with whoever is speaking: Aïr at full strength, the caller at half */
  private meter = () => {
    if (this.over) return;
    let a = 0;
    if (!this.still) {
      if (this.src) { this.analyser.getFloatTimeDomainData(this.wave); let s = 0; for (const v of this.wave) s += v * v; a = Math.min(1, Math.sqrt(s / this.wave.length) * 4); }
      else if (this.state === "hearing" || this.state === "listening") a = this.mic * 0.5;
    }
    this.amp.current += (a - this.amp.current) * 0.35;
    this.raf = requestAnimationFrame(this.meter);
  };

  private get over() { return this.state === "ended"; }       // read fresh after each await
  private set(s: CallState) { if (this.state !== s && (this.state !== "ended" || s === "ended")) { this.state = s; this.on.state(s); } }
  private fail(p: CallProblem) { if (this.over) return; this.on.problem(p); this.end(); }   // a late wake or worklet error after hanging up says nothing
  private release() {
    cancelAnimationFrame(this.raf); this.clear(); this.amp.current = 0;
    this.stream?.getTracks().forEach(tr => tr.stop()); this.stream = null;
    this.node?.disconnect(); this.node = null;
    void this.ctx.close().catch(() => {});
  }
}

/* 16 kHz mono 16-bit WAV, each output sample the mean of the input samples it covers (a simple low-pass) */
export function wav16k(chunks: Float32Array[], rate: number): ArrayBuffer {
  const total = chunks.reduce((n, c) => n + c.length, 0), all = new Float32Array(total);
  let o = 0; for (const c of chunks) { all.set(c, o); o += c.length; }
  const ratio = rate / 16000, n = Math.floor(total / ratio), b = new ArrayBuffer(44 + n * 2), v = new DataView(b);
  const s = (at: number, t: string) => { for (let i = 0; i < t.length; i++) v.setUint8(at + i, t.charCodeAt(i)); };
  s(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); s(8, "WAVE"); s(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); s(36, "data"); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const a = Math.floor(i * ratio), z = Math.max(a + 1, Math.floor((i + 1) * ratio));
    let sum = 0; for (let k = a; k < z && k < total; k++) sum += all[k];
    v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sum / (z - a))) * 0x7fff, true);
  }
  return b;
}
