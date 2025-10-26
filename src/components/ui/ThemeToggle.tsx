"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);

  // lire le thème au montage (localStorage ou prefers-color-scheme)
  useEffect(() => {
    const ls = localStorage.getItem("theme");
    const prefers = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const initial = ls ? ls === "dark" : prefers;
    setDark(initial);
    document.documentElement.classList.toggle("dark", initial);
    setMounted(true);
  }, []);

  // appliquer et persister
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      className="rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
      aria-label="Basculer le thème"
      title={dark ? "Passer en clair" : "Passer en sombre"}
    >
      {dark ? "🌙 Sombre" : "☀️ Clair"}
    </button>
  );
}
