import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-5">
      <nav className="flex items-center justify-between py-4">
        <b className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-xl text-transparent">◆ RankPilot AI</b>
        <div className="flex gap-2"><ThemeToggle /><Link className="btn" href="/login">Login</Link><Link className="btn btn-p" href="/signup">Get Started</Link></div>
      </nav>
      <section className="py-16 text-center">
        <h1 className="text-4xl font-extrabold sm:text-6xl">Understand Your Website.<br />Improve Your SEO.</h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-500">Run a technical SEO audit of your site: titles, meta descriptions, headings, canonicals, image alt text and HTTPS. Results are never guaranteed to change your rankings.</p>
        <Link className="btn btn-p mt-6" href="/signup">Start Your SEO Audit</Link>
      </section>
      <footer className="py-8 text-sm text-slate-500">© RankPilot AI</footer>
    </main>
  );
}
