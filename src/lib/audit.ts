import * as cheerio from "cheerio";
import { assertSafeUrl, safeFetch } from "./ssrf";
import { fetchRobots, isAllowed } from "./robots";

export type Severity = "critical" | "high" | "medium" | "low" | "pass";
export type Finding = { check: string; severity: Severity; url: string; evidence: string; recommendation: string };
const WEIGHT: Record<Severity, number> = { critical: 20, high: 10, medium: 5, low: 2, pass: 0 };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runAudit(startRaw: string, maxPages = 5, deadlineMs = 45_000) {
  const t0 = Date.now();
  const start = await assertSafeUrl(startRaw);
  const findings: Finding[] = [];
  const add = (check: string, severity: Severity, url: string, evidence: string, recommendation = "") =>
    findings.push({ check, severity, url, evidence, recommendation });

  const robots = await fetchRobots(start.origin);
  robots.found
    ? add("robots.txt", "pass", start.origin + "/robots.txt", "robots.txt found")
    : add("robots.txt", "low", start.origin + "/robots.txt", "No robots.txt found (or not readable)", "Add a robots.txt file.");
  try {
    const s = await safeFetch(start.origin + "/sitemap.xml", { maxBytes: 300_000, timeoutMs: 5000 });
    /<urlset|<sitemapindex/.test(s.body) && s.status === 200
      ? add("XML sitemap", "pass", start.origin + "/sitemap.xml", "sitemap.xml found")
      : add("XML sitemap", "low", start.origin + "/sitemap.xml", "No sitemap at /sitemap.xml (other locations were not checked)", "Publish an XML sitemap and reference it in robots.txt.");
  } catch { add("XML sitemap", "low", start.origin + "/sitemap.xml", "Could not be checked", "Publish an XML sitemap."); }

  const queue = [start.href], seen = new Set<string>(), skipped: string[] = [];
  const titles = new Map<string, string[]>();
  let pages = 0;

  while (queue.length && pages < maxPages && Date.now() - t0 < deadlineMs) {
    const u = queue.shift()!;
    if (seen.has(u)) continue;
    seen.add(u);
    if (!isAllowed(robots, new URL(u).pathname)) { skipped.push(u); continue; }
    let r;
    try { r = await safeFetch(u); } catch (e) {
      add("Page fetch", "high", u, e instanceof Error ? e.message : "Fetch failed", "Make sure the page is reachable.");
      continue;
    }
    if (r.status >= 400) { add("HTTP status", "high", u, "Status " + r.status, "Fix or remove this URL."); continue; }
    if (!(r.headers.get("content-type") || "").includes("text/html")) continue;
    pages++;
    const $ = cheerio.load(r.body);
    const page = r.finalUrl;

    new URL(page).protocol === "https:"
      ? add("HTTPS", "pass", page, "Served over HTTPS")
      : add("HTTPS", "high", page, "Page is served over HTTP", "Install a certificate and redirect HTTP to HTTPS.");

    const title = $("title").first().text().trim();
    if (!title) add("Title tag", "critical", page, "Missing title", "Add a unique title of about 30-60 characters.");
    else {
      titles.set(title, [...(titles.get(title) || []), page]);
      title.length < 30 || title.length > 60
        ? add("Title length", "low", page, `${title.length} characters: ${title.slice(0, 80)}`, "Aim for about 30-60 characters.")
        : add("Title tag", "pass", page, `${title.length} characters`);
    }
    const desc = ($('meta[name="description"]').attr("content") || "").trim();
    if (!desc) add("Meta description", "medium", page, "Missing meta description", "Write a 70-160 character summary.");
    else desc.length < 70 || desc.length > 160
      ? add("Meta description length", "low", page, `${desc.length} characters`, "Aim for about 70-160 characters.")
      : add("Meta description", "pass", page, `${desc.length} characters`);

    const h1 = $("h1").length;
    h1 === 0 ? add("H1 heading", "high", page, "No H1 found", "Add one clear H1.")
      : h1 > 1 ? add("H1 heading", "low", page, `${h1} H1 elements`, "Use a single H1.")
      : add("H1 heading", "pass", page, "One H1");
    let prev = 0, skippedLevel = false;
    $("h1,h2,h3,h4,h5,h6").each((_, el) => { const l = Number(el.tagName.slice(1)); if (prev && l > prev + 1) skippedLevel = true; prev = l; });
    skippedLevel ? add("Heading order", "low", page, "Heading levels are skipped (e.g. H2 to H4)", "Keep heading levels sequential.")
      : add("Heading order", "pass", page, "No skipped heading levels");

    const canon = $('link[rel="canonical"]').attr("href");
    canon ? add("Canonical URL", "pass", page, canon) : add("Canonical URL", "medium", page, "No canonical link", "Add a rel=canonical link.");
    if (/noindex/i.test($('meta[name="robots"]').attr("content") || "")) add("Robots meta", "critical", page, "Page is set to noindex", "Remove noindex if the page should appear in search.");

    const imgs = $("img"), noAlt = imgs.filter((_, e) => $(e).attr("alt") === undefined).length;
    imgs.length === 0 ? null : noAlt
      ? add("Image alt text", "medium", page, `${noAlt} of ${imgs.length} images have no alt attribute`, "Add descriptive alt text.")
      : add("Image alt text", "pass", page, `All ${imgs.length} images have alt`);

    $("a[href]").each((_, a) => {
      try {
        const l = new URL($(a).attr("href")!, page); l.hash = "";
        if (l.origin === start.origin && /^https?:$/.test(l.protocol) && !seen.has(l.href) && queue.length < 50) queue.push(l.href);
      } catch { /* ignore bad hrefs */ }
    });
    await sleep(400);
  }
  titles.forEach((urls, t) => { if (urls.length > 1) add("Duplicate titles", "medium", urls[0], `${urls.length} pages share the title: ${t.slice(0, 60)}`, "Give each page a unique title."); });

  const score = Math.max(0, 100 - findings.reduce((s, f) => s + WEIGHT[f.severity], 0));
  return {
    findings, score, pagesScanned: pages,
    summary: {
      pagesScanned: pages, maxPages, skippedByRobots: skipped,
      incomplete: queue.length > 0 || Date.now() - t0 >= deadlineMs,
      notChecked: ["Broken-link verification", "JavaScript-rendered content", "Mobile and Core Web Vitals (needs PageSpeed API)"],
    },
  };
}
