export type Summary = {
  totalBalance: number;
  monthIncome: number;
  monthExpenses: number;
};

export type CategorySpend = {
  category: string;
  amount: number;
};

export type Transaction = {
  id: number;
  date: string;
  merchant: string;
  category: string;
  amount: number;
};

export type MainGoal = {
  id: string | null;
  name: string;
  currentAmount: number;
  targetAmount: number;
};

export type DashboardResponse = {
  summary: Summary;
  spendingByCategory: CategorySpend[];
  recentTransactions: Transaction[];
  mainGoal: MainGoal;
  insights: string[];
};

export type CashFlowPoint = {
  date: string; // YYYY-MM-DD
  dayName: string; // Mon, Tue
  income: number;
  expenses: number;
};

export type CashFlowResponse = {
  data: CashFlowPoint[];
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export async function getDashboard(
  idToken: string,
  householdId?: string,
): Promise<DashboardResponse> {
  let url = `${API_BASE_URL}/dashboard`;
  if (householdId) {
    url += `?householdId=${householdId}`;
  }

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Dashboard API error ${res.status}`);
  }

  return res.json();
}

export async function getCashFlow(
  idToken: string,
  range: "this_week" | "last_week" | "this_month",
  householdId?: string,
): Promise<CashFlowResponse> {
  let url = `${API_BASE_URL}/dashboard/cashflow?range=${range}`;
  if (householdId) {
    url += `&householdId=${householdId}`;
  }

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Cashflow API error ${res.status}`);
  }

  return res.json();
}
