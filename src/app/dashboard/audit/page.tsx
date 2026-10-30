"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function NewAudit() {
  const router = useRouter();
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(""); setBusy(true);
    const url = String(new FormData(e.currentTarget).get("url"));
    try {
      const res = await fetch("/api/audit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Audit failed");
      router.push(`/dashboard/audits/${d.id}`);
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : "Audit failed"); setBusy(false); }
  }
  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">New SEO Audit</h1>
      <p className="mb-4 text-slate-500">Scans up to a few pages of your site and respects robots.txt. This can take up to a minute.</p>
      <form onSubmit={submit} className="card grid gap-3">
        <label>Website URL<input className="input" name="url" placeholder="https://example.com" required maxLength={2048} /></label>
        {err && <p role="alert" className="text-red-600">{err}</p>}
        <button className="btn btn-p" disabled={busy}>{busy ? "Scanning..." : "Start audit"}</button>
      </form>
    </>
  );
}
