"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Budget = {
  id: number;
  categorie: string;
  montant: number;
  mois: number;   // 1..12
  annee: number;  // ex: 2025
};
export type BudgetInput = Omit<Budget, "id">;

const BUDGETS_STORAGE_KEY = "budgets";

/** Contexte */
type BudgetsCtx = {
  budgets: Budget[];
  upsertBudget: (input: BudgetInput) => void;
  removeBudget: (id: number) => void;
};

const BudgetsContext = createContext<BudgetsCtx | null>(null);

/** Provider partagé (localStorage + CRUD) */
function BudgetsProvider({ children }: { children: React.ReactNode }) {
  const [budgets, setBudgets] = useState<Budget[]>([]);

  // Charger depuis localStorage (côté client)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BUDGETS_STORAGE_KEY);
      if (raw) setBudgets(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  // Sauvegarde
  useEffect(() => {
    try {
      localStorage.setItem(BUDGETS_STORAGE_KEY, JSON.stringify(budgets));
    } catch {
      // ignore
    }
  }, [budgets]);

  // Ajouter et mis à jour (clé: année + mois + catégorie normalisée)
  const upsertBudget = (input: BudgetInput) => {
    setBudgets((prev) => {
      const key = input.categorie.trim().toLowerCase();
      const idx = prev.findIndex(
        (b) =>
          b.annee === input.annee &&
          b.mois === input.mois &&
          b.categorie.trim().toLowerCase() === key
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], montant: input.montant, categorie: input.categorie };
        return copy;
      }
      return [...prev, { id: Date.now(), ...input }];
    });
  };

  const removeBudget = (id: number) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <BudgetsContext.Provider value={{ budgets, upsertBudget, removeBudget }}>
      {children}
    </BudgetsContext.Provider>
  );
}

/** Hook consommateur */
function useBudgets() {
  const ctx = useContext(BudgetsContext);
  if (!ctx) {
    throw new Error("useBudgets must be used within <BudgetsProvider>");
  }
  return ctx;
}

/** Exports  */
export { BudgetsProvider };
export default useBudgets;
