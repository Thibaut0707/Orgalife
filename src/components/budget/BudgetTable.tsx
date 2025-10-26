"use client";

import { useMemo } from "react";
import useBudgets from "./useBudgets";
import type { Budget } from "./useBudgets";

type Transaction = {
  id: number;
  type: "Dépense" | "Revenu";
  description: string;
  montant: number;
  date: string;
  categorie: string | unknown;
};

type Props = {
  selectedMonth: number;
  selectedYear: number;
  filteredTransactions: Transaction[];
  currency?: string;
};

const fmt = (n: number, currency = "$") =>
  `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${currency}`;

const WARN_THRESHOLD = 0.8; // 80%
const CRIT_THRESHOLD = 1.0; // 100%
const norm = (v: unknown) => String(v ?? "Autre").trim().toLowerCase();

function usageState(used: number, budget: number) {
  if (budget <= 0) return { color: "bg-gray-400", label: "—", ratio: 0, level: "none" as const };
  const ratio = used / budget;
  if (ratio < WARN_THRESHOLD) return { color: "bg-green-500", label: "OK", ratio, level: "ok" as const };
  if (ratio <= CRIT_THRESHOLD) return { color: "bg-amber-500", label: `${Math.round(ratio * 100)}%`, ratio, level: "warn" as const };
  return { color: "bg-red-600", label: "Dépassé", ratio, level: "crit" as const };
}

export default function BudgetTable({
  selectedMonth,
  selectedYear,
  filteredTransactions,
  currency = "$",
}: Props) {
  const { budgets, removeBudget } = useBudgets();

  // Budgets du mois/année
  const monthBudgets = useMemo(
    () =>
      budgets
        .filter((b: Budget) => b.annee === selectedYear && b.mois === selectedMonth)
        .sort((a, b) => a.categorie.localeCompare(b.categorie)),
    [budgets, selectedMonth, selectedYear]
  );

  // Sommes de dépenses par catégorie (normalisées)
  const depensesParCat = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of filteredTransactions) {
      if (t.type !== "Dépense") continue;
      const key = norm(t.categorie);
      map[key] = (map[key] || 0) + Math.abs(t.montant);
    }
    return map;
  }, [filteredTransactions]);

  // Alerte bandeau
  const alerts = useMemo(() => {
    const list: { categorie: string; level: "warn" | "crit"; ratio: number; used: number; budget: number }[] = [];
    for (const b of monthBudgets) {
      const used = depensesParCat[norm(b.categorie)] || 0;
      const st = usageState(used, b.montant);
      if (st.level === "warn" || st.level === "crit") {
        list.push({ categorie: b.categorie, level: st.level, ratio: st.ratio, used, budget: b.montant });
      }
    }
    return list.sort((a, b) => (a.level === "crit" ? -1 : 1));
  }, [monthBudgets, depensesParCat]);

  return (
    <div className="w-full">
      {/* Bandeau d’alerte */}
      {alerts.length > 0 && (
        <div
          className={`mb-3 rounded-md border px-3 py-2 text-sm ${
            alerts.some((a) => a.level === "crit")
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-amber-50 border-amber-200 text-amber-700"
          }`}
          role="status"
          aria-live="polite"
        >
          {alerts.some((a) => a.level === "crit") ? "⚠️ Dépassement budget" : "⚠️ Attention budget"}
          {" — "}
          {alerts
            .map((a) => `${a.categorie} (${Math.round(a.ratio * 100)}% • ${fmt(a.used, currency)}/${fmt(a.budget, currency)})`)
            .join(" • ")}
        </div>
      )}

      <div className="w-full overflow-x-auto">
        <table className="min-w-[720px] w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2 text-left">Catégorie</th>
              <th className="border px-4 py-2 text-right">Dépenses</th>
              <th className="border px-4 py-2 text-right">Budget</th>
              <th className="border px-4 py-2">Progression</th>
              <th className="border px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {monthBudgets.length === 0 && (
              <tr>
                <td className="border px-4 py-3 text-gray-500" colSpan={5}>
                  Aucun budget défini pour ce mois.
                </td>
              </tr>
            )}

            {monthBudgets.map((b) => {
              const used = depensesParCat[norm(b.categorie)] || 0;
              const st = usageState(used, b.montant);
              const ratioPct = b.montant > 0 ? Math.min(st.ratio * 100, 100) : 0;

              return (
                <tr
                  key={b.id}
                  className={`align-top ${
                    st.level === "crit" ? "bg-red-50" : st.level === "warn" ? "bg-amber-50" : ""
                  }`}
                >
                  <td className="border px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span>{b.categorie}</span>
                      {st.level === "crit" && (
                        <span className="inline-block text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          Dépassé
                        </span>
                      )}
                      {st.level === "warn" && (
                        <span className="inline-block text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          {Math.round(st.ratio * 100)}%
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="border px-4 py-2 text-right">{fmt(used, currency)}</td>
                  <td className="border px-4 py-2 text-right">{fmt(b.montant, currency)}</td>

                  <td className="border px-4 py-2">
                    <div className="w-full bg-gray-200 h-3 rounded-full">
                      <div
                        className={`h-3 rounded-full ${st.color}`}
                        style={{ width: `${ratioPct}%` }}
                        title={`${Math.round(st.ratio * 100)}% du budget`}
                      />
                    </div>
                    <div
                      className={`text-sm mt-1 ${
                        st.level === "crit" ? "text-red-700 font-semibold"
                        : st.level === "warn" ? "text-amber-700"
                        : "text-green-700"
                      }`}
                    >
                      {st.label}
                    </div>
                  </td>

                  <td className="border px-4 py-2 text-center">
                    <button
                      onClick={() => removeBudget(b.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      🗑️ Supprimer
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
