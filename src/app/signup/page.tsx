"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
export default function Signup() {
  const [msg, setMsg] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(""); setMsg("");
    const f = new FormData(e.currentTarget), password = String(f.get("password"));
    if (password.length < 8) return setErr("Password must be at least 8 characters.");
    setBusy(true);
    const { error } = await createClient().auth.signUp({
      email: String(f.get("email")), password,
      options: { data: { full_name: String(f.get("name")).slice(0, 80) }, emailRedirectTo: window.location.origin + "/auth/callback" },
    });
    setBusy(false);
    if (error) return setErr("Could not sign up. Try a different email or password.");
    setMsg("Account created. Check your email and click the confirmation link, then log in.");
  }
  return (
    <main className="mx-auto max-w-sm px-5 py-16">
      <h1 className="mb-4 text-2xl font-bold">Create account</h1>
      <form onSubmit={submit} className="card grid gap-3">
        <label>Name<input className="input" name="name" maxLength={80} /></label>
        <label>Email<input className="input" name="email" type="email" required autoComplete="email" /></label>
        <label>Password (8+ characters)<input className="input" name="password" type="password" required minLength={8} autoComplete="new-password" /></label>
        {err && <p role="alert" className="text-red-600">{err}</p>}
        {msg && <p role="status" className="text-green-600">{msg}</p>}
        <button className="btn btn-p" disabled={busy}>{busy ? "Please wait..." : "Sign up"}</button>
        <Link href="/login" className="text-sm text-violet-600">I already have an account</Link>
      </form>
    </main>
  );
}
