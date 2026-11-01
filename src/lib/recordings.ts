/* The Interpreter's recordings, kept in this browser only (IndexedDB), so a turn can be heard again after the page is
   reloaded; the server keeps the words and never the sound (db/migrations/0008_interpretations.sql). The newest
   KEEP are kept. Every call gives up quietly: a private window, a full disk or a refused database just means the
   recording cannot be played again. Signing out forgets them all. Browser only. */
const DB = "namu-create", STORE = "recordings", KEEP = 80;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE).createIndex("at", "at");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function run<T>(mode: IDBTransactionMode, work: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const t = db.transaction(STORE, mode), req = work(t.objectStore(STORE));
      t.oncomplete = () => resolve(req ? req.result : undefined);
      t.onerror = t.onabort = () => reject(t.error);
    });
  } finally { db.close(); }
}

/** Keeps a turn's recording, then lets the oldest go beyond KEEP. */
export async function keepRecording(id: string, audio: Blob): Promise<void> {
  try {
    await run("readwrite", s => { s.put({ audio, at: Date.now() }, id); });
    await run("readwrite", s => {
      let seen = 0;
      const c = s.index("at").openCursor(null, "prev");
      c.onsuccess = () => { const cur = c.result; if (!cur) return; if (++seen > KEEP) cur.delete(); cur.continue(); };
    });
  } catch { /* not kept: it plays until the page is left */ }
}

/** A turn's recording, if this browser kept it. */
export async function recording(id: string): Promise<Blob | null> {
  try { return (await run<{ audio: Blob } | undefined>("readonly", s => s.get(id)))?.audio ?? null; }
  catch { return null; }
}

/** Forgets some turns' recordings, as when their conversation is deleted. */
export async function forgetSome(ids: string[]): Promise<void> {
  try { await run("readwrite", s => { for (const id of ids) s.delete(id); }); } catch { /* nothing to forget */ }
}

/** Forgets every recording, as when the person signs out of a shared computer. */
export function forgetRecordings(): Promise<void> {
  return new Promise(resolve => {
    try { const r = indexedDB.deleteDatabase(DB); r.onsuccess = r.onerror = r.onblocked = () => resolve(); }
    catch { resolve(); }
  });
}
