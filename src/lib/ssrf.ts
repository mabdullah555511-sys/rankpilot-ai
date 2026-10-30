import dns from "node:dns/promises";
import net from "node:net";
import { Agent, fetch as ufetch } from "undici";

export class UserError extends Error {}

export function isPrivateIp(ip: string): boolean {
  if (ip.toLowerCase().startsWith("::ffff:") && ip.includes(".")) return isPrivateIp(ip.slice(7));
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19));
  }
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    return l === "::1" || l === "::" || l.startsWith("::ffff:") || /^f[cd]/.test(l) || /^fe[89ab]/.test(l);
  }
  return true;
}

/** Validates scheme, port, hostname and DNS. Throws UserError if the URL is not safe to fetch. */
export async function assertSafeUrl(raw: string): Promise<URL> {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { throw new UserError("Invalid URL"); }
  if (!["http:", "https:"].includes(u.protocol)) throw new UserError("Only http and https URLs are allowed");
  if (u.username || u.password) throw new UserError("URLs with credentials are not allowed");
  if (u.port && !["80", "443"].includes(u.port)) throw new UserError("Only ports 80 and 443 are allowed");
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || /\.(localhost|local|internal|lan|home)$/.test(h)) throw new UserError("This address is not allowed");
  if (net.isIP(h)) {
    if (isPrivateIp(h)) throw new UserError("This address is not allowed");
  } else {
    let addrs: { address: string }[];
    try { addrs = await dns.lookup(h, { all: true }); } catch { throw new UserError("Domain could not be resolved"); }
    if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new UserError("This address is not allowed");
  }
  return u;
}

// Re-checks the IP at connection time, which blocks DNS-rebinding tricks.
const agent = new Agent({
  connect: {
    lookup: (host: string, opts: any, cb: any) => {
      dns.lookup(host, { all: true }).then(
        (addrs) => {
          if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) return cb(new UserError("Blocked address"));
          if (opts && opts.all) cb(null, addrs); else cb(null, addrs[0].address, addrs[0].family);
        },
        (e) => cb(e),
      );
    },
  } as any,
});

export type Fetched = { status: number; finalUrl: string; headers: { get(n: string): string | null }; body: string };

async function readLimited(stream: ReadableStream<Uint8Array> | null, max: number): Promise<string> {
  if (!stream) return "";
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    chunks.push(value);
    if (total > max) { await reader.cancel(); break; }
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks));
}

/** Fetch with SSRF checks on every redirect hop, timeout, redirect limit and response-size limit. */
export async function safeFetch(raw: string, o: { maxBytes?: number; timeoutMs?: number; maxRedirects?: number } = {}): Promise<Fetched> {
  const max = o.maxBytes ?? 1_500_000, timeout = o.timeoutMs ?? 8000, maxR = o.maxRedirects ?? 4;
  let url = raw;
  for (let i = 0; i <= maxR; i++) {
    const u = await assertSafeUrl(url);
    const res = await ufetch(u.href, {
      dispatcher: agent, redirect: "manual", signal: AbortSignal.timeout(timeout),
      headers: { "user-agent": "RankPilotBot/1.0 (SEO audit)", accept: "text/html,application/xhtml+xml,text/plain,application/xml;q=0.9" },
    });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) { url = new URL(loc, u).href; await res.body?.cancel(); continue; }
    const body = await readLimited(res.body as ReadableStream<Uint8Array> | null, max);
    return { status: res.status, finalUrl: u.href, headers: res.headers, body };
  }
  throw new UserError("Too many redirects");
}
