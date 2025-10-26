// src/app/layout.tsx
"use client";

import "./globals.css";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ui/ThemeToggle";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const title = (() => {
    if (pathname?.startsWith("/finances")) return "Finances";
    if (pathname?.startsWith("/voyages")) return "Voyages";
    if (pathname?.startsWith("/taches")) return "Tâches";
    if (pathname?.startsWith("/vacances")) return "Vacances";
    if (pathname?.startsWith("/projets")) return "Projets";
    if (pathname?.startsWith("/assistant")) return "Assistant";
    return "OrgaLife";
  })();

  return (
    <html lang="fr" className="h-full" suppressHydrationWarning>
      <head>
        {/* ⬇️ Script qui force le thème AVANT hydratation (évite les bugs) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try {
    var ls = localStorage.getItem('theme');
    var prefers = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = ls ? ls === 'dark' : prefers;
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch (e) {}
})();
`,
          }}
        />
      </head>
      <body className="bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div className="min-h-screen w-full md:grid md:grid-cols-[18rem_1fr]">
          <Sidebar open={open} onClose={() => setOpen(false)} />

          <div className="flex flex-col min-h-screen">
            {/* Header */}
            <header className="h-16 bg-white/80 dark:bg-gray-900/70 backdrop-blur border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-3 sticky top-0 z-30">
              <button
                className="md:hidden rounded-lg border px-3 py-2 text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
                onClick={() => setOpen(true)}
                aria-label="Ouvrir le menu"
              >
                ☰
              </button>

              <h1 className="text-lg md:text-xl font-semibold">{title}</h1>

              <div className="ml-auto flex items-center gap-2">
                <ThemeToggle />
                <Link
                  href="/assistant"
                  className="hidden sm:inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm"
                >
                  🤖 Assistant
                </Link>
              </div>
            </header>

            {/* Sous-entête : fil d’Ariane */}
            <div className="px-4 md:px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <Breadcrumbs />
            </div>

            <main className="p-4 md:p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
