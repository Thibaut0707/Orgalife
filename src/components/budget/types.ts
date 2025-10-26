export type Budget = {
  id: number;
  categorie: string;
  montant: number;
  mois: number;   // 1..12
  annee: number;  // ex: 2025
};

export type BudgetInput = Omit<Budget, "id">;

export const BUDGETS_STORAGE_KEY = "budgets";
