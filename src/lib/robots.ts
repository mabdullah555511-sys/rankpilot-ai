import { safeFetch } from "./ssrf";
export type Robots = { found: boolean; rules: { allow: boolean; path: string }[] };

export async function fetchRobots(origin: string): Promise<Robots> {
  try {
    const r = await safeFetch(origin + "/robots.txt", { maxBytes: 200_000, timeoutMs: 5000 });
    if (r.status !== 200) return { found: false, rules: [] };
    const rules: Robots["rules"] = [];
    let applies = false, lastWasAgent = false;
    for (const raw of r.body.split(/\r?\n/)) {
      const line = raw.split("#")[0].trim();
      const i = line.indexOf(":");
      if (i < 0) continue;
      const k = line.slice(0, i).trim().toLowerCase(), v = line.slice(i + 1).trim();
      if (k === "user-agent") {
        const a = v.toLowerCase();
        const match = a === "*" || a === "rankpilotbot";
        applies = lastWasAgent ? applies || match : match;
        lastWasAgent = true;
      } else {
        lastWasAgent = false;
        if (applies && (k === "disallow" || k === "allow") && v) rules.push({ allow: k === "allow", path: v });
      }
    }
    return { found: true, rules };
  } catch { return { found: false, rules: [] }; }
}

// Simple prefix matching (wildcards are not interpreted). Longest match wins; Allow wins ties.
export function isAllowed(r: Robots, path: string): boolean {
  let best: { allow: boolean; len: number } | null = null;
  for (const rule of r.rules) {
    if (path.startsWith(rule.path) && (!best || rule.path.length > best.len || (rule.path.length === best.len && rule.allow)))
      best = { allow: rule.allow, len: rule.path.length };
  }
  return best ? best.allow : true;
}
