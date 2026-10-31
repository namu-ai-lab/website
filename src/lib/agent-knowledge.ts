/* What an agent knows, given to its text step in one message: its instructions, then the passages of its documents
   that best match what the caller just said. The agent service keeps its own system prompt and takes only user and
   assistant messages of at most 4,000 characters each (platform/modal/namu_agent.py, MAX_MESSAGE_CHARS), so this is
   the context message, kept inside that. The retriever is small on purpose: documents are cut into passages at
   paragraph and sentence ends, and passages are ranked by the query's words they share, rarer words weighing more.
   Pure and browser-safe, so it is tested without a database. */

export const MAX_MESSAGE_CHARS = 4000;
const PASSAGE = 700;

const STOP = new Set(("le la les un une des de du et ou en au aux a à est sont que qui quoi pour par sur dans avec ce cette ces il elle ils elles " +
  "on nous vous je tu ne pas plus se sa son ses leur leurs y the an and or of to in on for with is are be was it this that what how").split(" "));

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
export const words = (s: string) => (fold(s).match(/[\p{L}\p{N}]+/gu) ?? []).filter(w => w.length > 2 && !STOP.has(w));

/** A document cut into passages of about PASSAGE characters, at paragraph ends first, then sentence ends. */
export function passages(body: string, size = PASSAGE): string[] {
  const out: string[] = [];
  for (const para of body.split(/\n\s*\n/).map(p => p.replace(/\s+/g, " ").trim()).filter(Boolean)) {
    if (para.length <= size) { out.push(para); continue; }
    let cur = "";
    for (const s of para.match(/[^.!?]+[.!?]*\s*/g) ?? [para]) {
      if (cur && cur.length + s.length > size) { out.push(cur.trim()); cur = ""; }
      cur += s;
      while (cur.length > size * 1.5) { out.push(cur.slice(0, size).trim()); cur = cur.slice(size); }
    }
    if (cur.trim()) out.push(cur.trim());
  }
  return out;
}

export type Doc = { name: string; body: string };

/** The passages that share the most (and the rarest) words with the query, best first, within `budget` characters. */
export function retrieve(docs: readonly Doc[], query: string, budget: number): { name: string; text: string }[] {
  const all = docs.flatMap(d => passages(d.body).map(text => ({ name: d.name, text, terms: new Set(words(text)) })));
  const q = [...new Set(words(query))];
  if (!all.length || !q.length) return [];
  const df = new Map(q.map(t => [t, all.filter(p => p.terms.has(t)).length]));
  const scored = all.map((p, i) => ({ p, i, score: q.reduce((s, t) => s + (p.terms.has(t) ? Math.log(1 + all.length / (df.get(t) || 1)) : 0), 0) }))
    .filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.i - b.i);
  const out: { name: string; text: string }[] = [];
  let used = 0;
  for (const { p } of scored) {
    if (used + p.text.length > budget) continue;
    out.push({ name: p.name, text: p.text }); used += p.text.length;
  }
  return out;
}

/** The context message: the agent's instructions, then the matching passages, the whole within MAX_MESSAGE_CHARS.
    Labelled so the model reads it as the organisation's brief, not as something the caller said. */
export function contextMessage(o: { name: string; instructions: string; docs: readonly Doc[]; query: string; languages: string[] }): string {
  const head = `[Context from the organisation that runs this agent. It is not the caller speaking.]\nAgent: ${o.name}\n` +
    `Answer in the caller's language (${o.languages.join(", ")}), briefly, as a voice would.`;
  const brief = o.instructions.trim() ? `\n\nInstructions:\n${o.instructions.trim()}` : "";
  const room = MAX_MESSAGE_CHARS - head.length - brief.length - 40;
  const found = room > 200 ? retrieve(o.docs, o.query, room) : [];
  const knowledge = found.length ? `\n\nFrom the organisation's documents:\n${found.map(f => `- (${f.name}) ${f.text}`).join("\n")}` : "";
  return `${head}${brief}${knowledge}`.slice(0, MAX_MESSAGE_CHARS);
}
