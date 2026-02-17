import { auth } from "../../../lib/firebase";

export interface BudgetSummary {
  id: string;
  name: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  currencyCode: string;
  createdAt: string;
  status: string;
  archivedAt: string | null;
  parentBudgetId: string | null;
  ownerName: string;
  householdName: string | null;
  memberNames: string[];
}

export interface CreateBudgetInput {
  name: string;
}

export interface Account {
  id: string;
  name: string;
  accountType: string;
  currencyCode: string;
  currentBalance: number;
  maskedRef: string;
}

export interface BudgetCategoryGroup {
  parent: string;
  items: { id: number; name: string }[];
}

export interface CategoryLimit {
  categoryId: number;
  amount: number;
}

export interface BudgetSetupInput {
  periodType: string;
  periodStart: string;
  periodEnd: string;
  accountIds: string[];
  categoryLimits: CategoryLimit[];
  incomeAmount?: number;
  savingsTargetAmount?: number;
  savingsTargetType?: "amount" | "percentage";
  autoRenew?: boolean;
}

export interface BudgetDetail {
  id: string;
  name: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  currencyCode: string;
  createdAt: string;
  incomeAmount: number | null;
  savingsTargetAmount: number | null;
  savingsTargetType: "amount" | "percentage" | null;
  autoRenew: boolean;
  accountIds: string[];
  categoryLimits: CategoryLimit[];
}

export async function getBudgets(
  status: "active" | "completed" = "active",
  householdId?: string,
): Promise<{ budgets: BudgetSummary[] }> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();

  let url = `http://localhost:5001/api/budgets?status=${status}`;
  if (householdId) {
    url += `&household_id=${householdId}`;
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error("Failed to fetch budgets");
  return res.json();
}

export async function createBudget(
  input: CreateBudgetInput,
): Promise<{ budget: BudgetSummary }> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();

  const res = await fetch(`${API_BASE}/budgets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create budget");
  return data;
}

export async function renewExpiredBudgets(): Promise<{ renewedCount: number }> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();

  const res = await fetch(`${API_BASE}/budgets/renew-expired`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to renew budgets");
  return data;
}

export async function getBudgetDetail(
  id: string,
): Promise<{ budget: BudgetDetail }> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();

  const res = await fetch(`${API_BASE}/budgets/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch budget details");
  return data;
}

export async function getBudgetAccounts(
  budgetId: string,
): Promise<{ accounts: Account[] }> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();

  const res = await fetch(`${API_BASE}/budgets/${budgetId}/accounts`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch accounts");
  return data;
}

export async function getBudgetCategories(
  budgetId: string,
): Promise<{ categoryGroups: BudgetCategoryGroup[] }> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();

  const res = await fetch(`${API_BASE}/budgets/${budgetId}/categories`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch categories");
  return data;
}

export async function saveBudgetSetup(
  budgetId: string,
  setupData: BudgetSetupInput,
): Promise<{ success: boolean }> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();

  const res = await fetch(`${API_BASE}/budgets/${budgetId}/setup`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(setupData),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to save budget setup");
  return data;
}

// Budget View Types
export interface BudgetViewTransaction {
  id: string;
  date: string;
  description: string;
  merchant: string;
  amount: number;
  categoryId: number | null;
  categoryName: string | null;
  accountName: string;
  status: string;
}

export interface BudgetViewCategory {
  categoryId: number;
  categoryName: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
  status: "under" | "near" | "over" | "hit";
  transactionCount: number;
}

export interface BudgetViewHistory {
  budgetId: string;
  periodStart: string;
  periodEnd: string;
  totalBudgeted: number;
  totalSpent: number;
  percentageUsed: number;
  status: "under" | "near" | "over" | "hit";
}

export interface BudgetViewData {
  budget: {
    id: string;
    name: string;
    periodType: string;
    periodStart: string;
    periodEnd: string;
    currencyCode: string;
  };
  summary: {
    totalBudgeted: number;
    totalSpent: number;
    totalRemaining: number;
    percentageUsed: number;
    periodElapsed: number;
  };
  categories: BudgetViewCategory[];
  transactions: BudgetViewTransaction[];
  analytics: {
    biggestTransactions: BudgetViewTransaction[];
    overBudgetCategories: string[];
    projectedSpend: number;
    projectedOverage: number;
    burnRate: number;
    healthStatus: "healthy" | "warning" | "danger";
  };
  unassigned: BudgetViewTransaction[];
  history: BudgetViewHistory[];
}

export async function getBudgetView(budgetId: string): Promise<BudgetViewData> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();

  const res = await fetch(`${API_BASE}/budgets/${budgetId}/view`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch budget view");
  return data;
}
