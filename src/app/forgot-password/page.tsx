"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
export default function Forgot() {
  const [msg, setMsg] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email"));
    await createClient().auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/auth/callback?next=/reset-password" });
    setMsg("If that email has an account, a reset link has been sent.");
  }
  return (
    <main className="mx-auto max-w-sm px-5 py-16">
      <h1 className="mb-4 text-2xl font-bold">Reset password</h1>
      <form onSubmit={submit} className="card grid gap-3">
        <label>Email<input className="input" name="email" type="email" required /></label>
        {msg && <p role="status" className="text-green-600">{msg}</p>}
        <button className="btn btn-p">Send reset link</button>
      </form>
    </main>
  );
}
