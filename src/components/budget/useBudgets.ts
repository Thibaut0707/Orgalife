"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

/** Types */
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
type Ctx = {
  budgets: Budget[];
  upsertBudget: (input: BudgetInput) => void;  // ajoute ou remplace
  updateBudget: (id: number, montant: number, categorie?: string) => void; // modifie existant
  removeBudget: (id: number) => void;
};
const BudgetsContext = createContext<Ctx | null>(null);

export function BudgetsProvider({ children }: { children: React.ReactNode }) {
  const [budgets, setBudgets] = useState<Budget[]>([]);

  // Charger
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BUDGETS_STORAGE_KEY);
      if (raw) setBudgets(JSON.parse(raw));
    } catch {}
  }, []);

  // Sauver
  useEffect(() => {
    try {
      localStorage.setItem(BUDGETS_STORAGE_KEY, JSON.stringify(budgets));
    } catch {}
  }, [budgets]);

  // Ajouter  remplacer automatiquement
  const upsertBudget = (input: BudgetInput) => {
    setBudgets((prev) => {
      const idx = prev.findIndex(
        (b) =>
          b.annee === input.annee &&
          b.mois === input.mois &&
          b.categorie.trim().toLowerCase() === input.categorie.trim().toLowerCase()
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], montant: input.montant, categorie: input.categorie };
        return copy;
      }
      return [...prev, { id: Date.now(), ...input }];
    });
  };

  // modifier un budget existant par ID
  const updateBudget = (id: number, montant: number, categorie?: string) => {
    setBudgets((prev) =>
      prev.map((b) =>
        b.id === id
          ? { ...b, montant, categorie: categorie ?? b.categorie }
          : b
      )
    );
  };

  const removeBudget = (id: number) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <BudgetsContext.Provider
      value={{ budgets, upsertBudget, updateBudget, removeBudget }}
    >
      {children}
    </BudgetsContext.Provider>
  );
}

export default function useBudgets() {
  const ctx = useContext(BudgetsContext);
  if (!ctx) throw new Error("useBudgets must be used within <BudgetsProvider>");
  return ctx;
}
