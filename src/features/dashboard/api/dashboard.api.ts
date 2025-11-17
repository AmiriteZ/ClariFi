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

const API_BASE_URL = "http://localhost:5001/api";

export async function getDashboard(idToken: string): Promise<DashboardResponse> {
  const res = await fetch(`${API_BASE_URL}/dashboard`, {
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
