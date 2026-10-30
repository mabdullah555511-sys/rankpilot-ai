import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutButton from "@/components/LogoutButton";
import { createClient } from "@/lib/supabase/server";
export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const { data: p } = await sb.from("profiles").select("role").eq("id", user?.id ?? "").maybeSingle();
  const links: [string, string][] = [["/dashboard", "Overview"], ["/dashboard/audit", "New Audit"], ["/dashboard/settings", "Settings"]];
  if (p?.role === "admin") links.push(["/admin", "Admin"]);
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-slate-200 p-4 dark:border-slate-800 md:w-56 md:border-b-0 md:border-r">
        <b className="mb-3 block bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-lg text-transparent">◆ RankPilot AI</b>
        <nav className="flex flex-wrap gap-2 md:block">{links.map(([h, t]) => <Link key={h} href={h} className="block rounded-lg px-3 py-2 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800">{t}</Link>)}</nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-end gap-2 border-b border-slate-200 p-3 dark:border-slate-800"><span className="mr-auto px-2 text-sm text-slate-500">{user?.email}</span><ThemeToggle /><LogoutButton /></header>
        <div className="max-w-4xl p-5">{children}</div>
      </div>
    </div>
  );
}
