"use client";

import { useState } from "react";
import useBudgets from "./useBudgets";

type Props = {
  selectedMonth: number; // 1..12
  selectedYear: number;
  categories: string[];
};

export default function BudgetForm({ selectedMonth, selectedYear, categories }: Props) {
  const { upsertBudget } = useBudgets();
  const [categorie, setCategorie] = useState<string>(categories[0] ?? "Alimentation");
  const [montant, setMontant] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categorie || !montant) return;
    const val = Number(montant);
    if (Number.isNaN(val) || val < 0) return;
    upsertBudget({ annee: selectedYear, mois: selectedMonth, categorie, montant: val });
    setMontant("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border rounded-lg bg-white shadow"
    >
      <div className="flex items-center gap-2">
        <label className="min-w-24">Catégorie :</label>
        <select
          value={categorie}
          onChange={(e) => setCategorie(e.target.value)}
          className="border p-2 rounded w-full"
        >
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="min-w-24">Budget :</label>
        <input
          type="number"
          min={0}
          placeholder="Montant (ex: 300)"
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          className="border p-2 rounded w-full"
        />
      </div>

      <div className="flex items-center justify-start md:justify-end">
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
          title="Créer / Mettre à jour le budget pour ce mois"
        >
          💾 Enregistrer le budget ({selectedMonth}/{selectedYear})
        </button>
      </div>
    </form>
  );
}
