"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
export default function Settings() {
  const sb = createClient();
  const [name, setName] = useState(""); const [msg, setMsg] = useState("");
  useEffect(() => { sb.from("profiles").select("full_name").maybeSingle().then(({ data }) => setName(data?.full_name ?? "")); }, []); // eslint-disable-line
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from("profiles").update({ full_name: name.slice(0, 80) }).eq("id", user!.id);
    setMsg(error ? "Could not save." : "Saved.");
  }
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Settings</h1>
      <form onSubmit={save} className="card grid max-w-md gap-3">
        <label>Full name<input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></label>
        <button className="btn btn-p">Save profile</button>{msg && <p role="status">{msg}</p>}
      </form>
      <p className="mt-4 text-sm text-slate-500">To change your password, use Forgot password on the login page. Billing is not connected.</p>
    </>
  );
}
