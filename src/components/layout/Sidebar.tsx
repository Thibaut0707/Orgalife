"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: string; // emoji pour éviter d'ajouter une lib d'icônes
};

const NAV: NavItem[] = [
  { href: "/finances", label: "Finances", icon: "💰" },
  { href: "/voyages", label: "Voyages", icon: "✈️" },
  { href: "/taches", label: "Tâches", icon: "🗂️" },
  { href: "/vacances", label: "Vacances", icon: "🏝️" },
  { href: "/projets", label: "Projets", icon: "📦" },
  { href: "/assistant", label: "Assistant", icon: "🤖" },
];

export default function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  // Fermer le drawer mobile si on change de page
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const NavLink = ({ href, label, icon }: NavItem) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
          ${active
            ? "bg-indigo-600 text-white"
            : "text-gray-700 hover:bg-gray-100"
          }`}
      >
        <span className="text-lg">{icon}</span>
        <span className="font-medium">{label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Overlay mobile */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/40 md:hidden transition-opacity ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer mobile + Sidebar desktop */}
      <aside
        className={`
          fixed z-40 top-0 left-0 h-full w-72 bg-white border-r shadow-lg
          md:shadow-none md:border-r md:static md:translate-x-0
          transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="h-16 flex items-center px-4 border-b">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white grid place-items-center font-bold">
              OL
            </div>
            <div>
              <div className="text-sm text-gray-500 leading-tight">OrgaLife</div>
              <div className="text-base font-semibold">Tableau de bord</div>
            </div>
          </div>

          {/* Bouton close mobile */}
          <button
            onClick={onClose}
            className="ml-auto md:hidden text-gray-500 hover:text-gray-700"
            aria-label="Fermer le menu"
          >
            ✖
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {NAV.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        <div className="p-3 mt-auto">
          <div className="rounded-lg bg-gray-50 border p-3 text-sm text-gray-600">
            <div className="font-semibold text-gray-800 mb-1">Astuce</div>
            <div>
              Utilise la page <span className="font-medium">Assistant</span> pour poser des questions à l’IA.
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
