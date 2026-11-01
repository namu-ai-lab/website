/* A .zip of several files, stored without compression (audio is already compressed or does not shrink much), for
   "download every language at once". Small on purpose: no library. Browser-safe. */

const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) { let c = i; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[i] = c >>> 0; }
  return t;
})();
export function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (const x of b) c = TABLE[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export type ZipEntry = { name: string; data: Uint8Array };

export function zip(entries: ZipEntry[], when = new Date()): Blob {
  const enc = new TextEncoder();
  const time = (when.getHours() << 11) | (when.getMinutes() << 5) | (when.getSeconds() >> 1);
  const date = ((when.getFullYear() - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate();
  const parts: Uint8Array[] = [], central: Uint8Array[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = enc.encode(e.name), crc = crc32(e.data), size = e.data.length;
    const local = new Uint8Array(30 + name.length), lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x0800, true); lv.setUint16(8, 0, true);
    lv.setUint16(10, time, true); lv.setUint16(12, date, true); lv.setUint32(14, crc, true); lv.setUint32(18, size, true); lv.setUint32(22, size, true);
    lv.setUint16(26, name.length, true); lv.setUint16(28, 0, true); local.set(name, 30);
    const dir = new Uint8Array(46 + name.length), dv = new DataView(dir.buffer);
    dv.setUint32(0, 0x02014b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 20, true); dv.setUint16(8, 0x0800, true); dv.setUint16(10, 0, true);
    dv.setUint16(12, time, true); dv.setUint16(14, date, true); dv.setUint32(16, crc, true); dv.setUint32(20, size, true); dv.setUint32(24, size, true);
    dv.setUint16(28, name.length, true); dv.setUint32(42, offset, true); dir.set(name, 46);
    parts.push(local, e.data); central.push(dir);
    offset += local.length + size;
  }
  const dirSize = central.reduce((s, d) => s + d.length, 0);
  const end = new Uint8Array(22), ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, entries.length, true); ev.setUint16(10, entries.length, true);
  ev.setUint32(12, dirSize, true); ev.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end] as BlobPart[], { type: "application/zip" });
}
