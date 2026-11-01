/* Who the demo's per-visitor limit counts (the gateway's address_bucket, platform/modal/namu_gateway.py): an IPv4
   address as it is, an IPv6 address as its /64. One host usually holds a whole /64 and could take a fresh address for
   every request, so a limit per IPv6 address would be no limit. Written the way Python's ipaddress writes a network
   ("2001:db8:1:2::/64"), so the gateway counts it in the same bucket as the raw address. Anything that is not an IP
   address is passed on unchanged. Pure, browser-safe. */
const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

/** The eight 16-bit groups of an IPv6 address, or null. Accepts :: and a dotted IPv4 tail; a zone (%eth0) is dropped. */
function groups(ip: string): number[] | null {
  let s = ip.split("%")[0].toLowerCase();
  const tail = s.match(/:(\d+\.\d+\.\d+\.\d+)$/);
  if (tail) {
    if (!IPV4.test(tail[1])) return null;
    const b = tail[1].split(".").map(Number);
    s = `${s.slice(0, -tail[1].length)}${((b[0] << 8) | b[1]).toString(16)}:${((b[2] << 8) | b[3]).toString(16)}`;
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const part = (h: string) => (h === "" ? [] : h.split(":"));
  const head = part(halves[0]), rest = halves.length === 2 ? part(halves[1]) : [];
  const fill = 8 - head.length - rest.length;
  if (halves.length === 2 ? fill < 1 : fill !== 0) return null;
  const all = [...head, ...Array<string>(halves.length === 2 ? fill : 0).fill("0"), ...rest];
  if (!all.every(g => /^[0-9a-f]{1,4}$/.test(g))) return null;
  return all.map(g => parseInt(g, 16));
}

export function visitorBucket(ip: string): string {
  const raw = ip.trim().replace(/^\[(.*)\]$/, "$1");
  if (IPV4.test(raw)) return raw;
  const g = groups(raw);
  if (!g) return ip;
  if (g.slice(0, 5).every(x => x === 0) && g[5] === 0xffff) return `${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`;  // ::ffff:a.b.c.d
  const net = g.slice(0, 4);
  while (net.length && net[net.length - 1] === 0) net.pop();      // trailing zero groups join the zeros of the host half
  return `${net.map(x => x.toString(16)).join(":")}::/64`;
}
