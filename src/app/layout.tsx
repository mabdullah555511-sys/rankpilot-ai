import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "RankPilot AI", description: "Understand Your Website. Improve Your SEO." };
const themeScript = "try{var t=localStorage.getItem('rp-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>{children}</body>
    </html>
  );
}
