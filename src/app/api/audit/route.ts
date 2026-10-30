import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { runAudit } from "@/lib/audit";
import { UserError, assertSafeUrl } from "@/lib/ssrf";

export const maxDuration = 60;
const Body = z.object({ url: z.string().trim().min(4).max(2048) });

export async function POST(req: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please enter a valid URL." }, { status: 400 });
  let url = parsed.data.url;
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  try { await assertSafeUrl(url); } catch (e) {
    return NextResponse.json({ error: e instanceof UserError ? e.message : "Invalid URL" }, { status: 400 });
  }

  // Rate limit per user (counted in the database, so it works on serverless hosting).
  const limit = Number(process.env.AUDIT_HOURLY_LIMIT || 10);
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await sb.from("seo_audits").select("*", { count: "exact", head: true }).gte("created_at", since);
  if ((count ?? 0) >= limit) return NextResponse.json({ error: "Hourly audit limit reached. Try again later." }, { status: 429 });

  const origin = new URL(url).origin;
  const { data: site } = await sb.from("websites").upsert({ user_id: user.id, url: origin }, { onConflict: "user_id,url" }).select("id").single();
  const { data: audit, error: insErr } = await sb.from("seo_audits").insert({ user_id: user.id, website_id: site?.id ?? null, url, status: "running" }).select("id").single();
  if (insErr || !audit) return NextResponse.json({ error: "Could not start the audit." }, { status: 500 });

  try {
    const r = await runAudit(url, Number(process.env.AUDIT_MAX_PAGES || 5));
    await sb.from("audit_results").insert(r.findings.map((f) => ({
      audit_id: audit.id, user_id: user.id, check_name: f.check, severity: f.severity,
      page_url: f.url, evidence: f.evidence, recommendation: f.recommendation, passed: f.severity === "pass",
    })));
    await sb.from("seo_audits").update({ status: "completed", score: r.score, pages_scanned: r.pagesScanned, summary: r.summary }).eq("id", audit.id);
    return NextResponse.json({ id: audit.id });
  } catch (e) {
    await sb.from("seo_audits").update({ status: "failed" }).eq("id", audit.id);
    return NextResponse.json({ error: e instanceof UserError ? e.message : "The audit failed. Please try again." }, { status: 500 });
  }
}
