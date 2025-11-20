import { auth } from "../../../lib/firebase";

export interface BudgetSummary {
  id: string;
  name: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  currencyCode: string;
  createdAt: string;
  ownerName: string;
  householdName: string | null;
  memberNames: string[];
}

export interface CreateBudgetInput {
  name: string;
}

export async function getBudgets(): Promise<{ budgets: BudgetSummary[] }> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();

  const res = await fetch("http://localhost:5001/api/budgets", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error("Failed to fetch budgets");
  return res.json();
}

export async function createBudget(
  input: CreateBudgetInput
): Promise<{ budget: BudgetSummary }> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();

  const res = await fetch("http://localhost:5001/api/budgets", {
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

export async function getBudgetDetail(
  id: string
): Promise<{ budget: BudgetSummary }> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();

  const res = await fetch(`http://localhost:5001/api/budgets/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch budget details");
  return data;
}
