import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
export default async function Dashboard() {
  const sb = await createClient();
  const [s, a, i, r] = await Promise.all([
    sb.from("websites").select("*", { count: "exact", head: true }),
    sb.from("seo_audits").select("*", { count: "exact", head: true }),
    sb.from("audit_results").select("*", { count: "exact", head: true }).eq("passed", false),
    sb.from("seo_audits").select("id,url,score,pages_scanned,status,created_at").order("created_at", { ascending: false }).limit(5),
  ]);
  const stat = (t: string, n: number | null) => <div className="card"><span className="text-slate-500">{t}</span><div className="text-3xl font-bold">{n ?? 0}</div></div>;
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Overview</h1>
      <div className="grid gap-4 sm:grid-cols-3">{stat("Websites", s.count)}{stat("Audits", a.count)}{stat("Issues found", i.count)}</div>
      <Link href="/dashboard/audit" className="btn btn-p my-5">Run a new audit</Link>
      <h2 className="mb-2 text-lg font-bold">Recent audits</h2>
      {r.data?.length ? r.data.map((x) => (
        <Link key={x.id} href={`/dashboard/audits/${x.id}`} className="card mb-2 block">
          <b className="break-all">{x.url}</b>
          <div className="text-sm text-slate-500">{x.status} · score {x.score ?? "-"} · {x.pages_scanned} page(s) · {new Date(x.created_at).toLocaleString()}</div>
        </Link>
      )) : <div className="card text-center text-slate-500">No audits yet. Run your first audit.</div>}
    </>
  );
}
