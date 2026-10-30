import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
export default async function Admin() {
  // Authorization happens on the server: the role is read from the database, never from the browser.
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) notFound();
  const { data: me } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") notFound();
  const admin = createAdminClient();
  const [u, a, f] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("seo_audits").select("*", { count: "exact", head: true }),
    admin.from("seo_audits").select("id,url,created_at").eq("status", "failed").order("created_at", { ascending: false }).limit(10),
  ]);
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Admin</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card"><span className="text-slate-500">Users</span><div className="text-3xl font-bold">{u.count ?? 0}</div></div>
        <div className="card"><span className="text-slate-500">Audits</span><div className="text-3xl font-bold">{a.count ?? 0}</div></div>
      </div>
      <h2 className="mb-2 mt-5 text-lg font-bold">Recent failed audits</h2>
      {f.data?.length ? f.data.map((x) => <div key={x.id} className="card mb-2 break-all">{x.url}</div>) : <div className="card text-slate-500">None.</div>}
    </>
  );
}
