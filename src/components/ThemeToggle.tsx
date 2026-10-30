"use client";
export default function ThemeToggle() {
  return (
    <button className="btn" aria-label="Toggle theme" onClick={() => {
      const dark = document.documentElement.classList.toggle("dark");
      try { localStorage.setItem("rp-theme", dark ? "dark" : "light"); } catch { /* ignore */ }
    }}>🌓</button>
  );
}
