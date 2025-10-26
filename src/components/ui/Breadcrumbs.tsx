"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LABELS: Record<string, string> = {
  "finances": "Finances",
  "voyages": "Voyages",
  "taches": "Tâches",
  "vacances": "Vacances",
  "projets": "Projets",
  "assistant": "Assistant",
};

export default function Breadcrumbs() {
  const pathname = usePathname() || "/";
  const parts = pathname.split("/").filter(Boolean);

  // Home only
  if (parts.length === 0) {
    return (
      <nav className="text-sm text-gray-500 dark:text-gray-400">Accueil</nav>
    );
  }

  const crumbs = parts.map((seg, idx) => {
    const href = "/" + parts.slice(0, idx + 1).join("/");
    const label = LABELS[seg] || decodeURIComponent(seg);
    const last = idx === parts.length - 1;
    return last ? (
      <span key={href} className="font-medium text-gray-700 dark:text-gray-200">
        {label}
      </span>
    ) : (
      <Link
        key={href}
        href={href}
        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        {label}
      </Link>
    );
  });

  return (
    <nav className="text-sm flex items-center gap-2 overflow-x-auto">
      <Link href="/" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
        Accueil
      </Link>
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-2">
          <span className="text-gray-400 dark:text-gray-600">/</span>
          {c}
        </span>
      ))}
    </nav>
  );
}
