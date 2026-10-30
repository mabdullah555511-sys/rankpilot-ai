"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
export default function Login() {
  const router = useRouter();
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setErr("");
    const f = new FormData(e.currentTarget);
    const { error } = await createClient().auth.signInWithPassword({ email: String(f.get("email")), password: String(f.get("password")) });
    setBusy(false);
    if (error) return setErr("Login failed. Check your email and password.");
    router.push("/dashboard"); router.refresh();
  }
  return (
    <main className="mx-auto max-w-sm px-5 py-16">
      <h1 className="mb-4 text-2xl font-bold">Login</h1>
      <form onSubmit={submit} className="card grid gap-3">
        <label>Email<input className="input" name="email" type="email" required autoComplete="email" /></label>
        <label>Password<input className="input" name="password" type="password" required autoComplete="current-password" /></label>
        {err && <p role="alert" className="text-red-600">{err}</p>}
        <button className="btn btn-p" disabled={busy}>{busy ? "Please wait..." : "Login"}</button>
        <Link href="/forgot-password" className="text-sm text-violet-600">Forgot password?</Link>
        <Link href="/signup" className="text-sm text-violet-600">Create an account</Link>
      </form>
    </main>
  );
}
