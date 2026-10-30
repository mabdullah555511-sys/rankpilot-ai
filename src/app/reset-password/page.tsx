"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
export default function Reset() {
  const router = useRouter(); const [err, setErr] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password"));
    if (password.length < 8) return setErr("Password must be at least 8 characters.");
    const { error } = await createClient().auth.updateUser({ password });
    if (error) return setErr("Could not update the password. Open the reset link again.");
    router.push("/dashboard");
  }
  return (
    <main className="mx-auto max-w-sm px-5 py-16">
      <h1 className="mb-4 text-2xl font-bold">Choose a new password</h1>
      <form onSubmit={submit} className="card grid gap-3">
        <label>New password<input className="input" name="password" type="password" required minLength={8} /></label>
        {err && <p role="alert" className="text-red-600">{err}</p>}
        <button className="btn btn-p">Update password</button>
      </form>
    </main>
  );
}
