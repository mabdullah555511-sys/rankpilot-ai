import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
const ORDER = ["critical", "high", "medium", "low", "pass"];
const COLOR: Record<string, string> = { critical: "bg-red-600", high: "bg-orange-600", medium: "bg-yellow-600", low: "bg-blue-600", pass: "bg-green-600" };
export default async function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const { data: a } = await sb.from("seo_audits").select("*").eq("id", id).maybeSingle(); // RLS: only the owner can read
  if (!a) notFound();
  const { data: res } = await sb.from("audit_results").select("*").eq("audit_id", id);
  const sorted = [...(res ?? [])].sort((x, y) => ORDER.indexOf(x.severity) - ORDER.indexOf(y.severity));
  const sum = a.summary as { incomplete?: boolean; notChecked?: string[]; skippedByRobots?: string[] } | null;
  return (
    <>
      <h1 className="break-all text-2xl font-bold">{a.url}</h1>
      <p className="mb-4 text-slate-500">Status: {a.status} · Score: {a.score ?? "-"} / 100 · Pages scanned: {a.pages_scanned}</p>
      {sum && <div className="card mb-4 text-sm">
        {sum.incomplete && <p>The scan stopped at its page or time limit; not every page was checked.</p>}
        {!!sum.skippedByRobots?.length && <p>Skipped because robots.txt disallows them: {sum.skippedByRobots.length}</p>}
        <p>Not checked in this scan: {sum.notChecked?.join(", ")}.</p>
      </div>}
      {sorted.map((r) => (
        <div key={r.id} className="card mb-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold text-white ${COLOR[r.severity]}`}>{r.severity}</span> <b>{r.check_name}</b>
          <div className="break-all text-sm text-slate-500">{r.page_url}</div>
          <div>{r.evidence}</div>
          {r.recommendation && <div className="text-slate-500">Fix: {r.recommendation}</div>}
        </div>
      ))}
    </>
  );
}
