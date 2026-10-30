import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") || "/dashboard";
  if (!next.startsWith("/") || next.startsWith("//")) next = "/dashboard"; // prevent open redirects
  if (code) {
    const sb = await createClient();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(origin + next);
  }
  return NextResponse.redirect(origin + "/login");
}
