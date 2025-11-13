//import { auth } from "../../../lib/firebase";

// ------- Types for dashboard data -------

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

// Base URL for your backend API
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5001/api";

/**
 * Fetch the dashboard data for the currently logged-in user.
 * Uses the Firebase ID token in the Authorization header.
 */
export async function getDashboard(): Promise<DashboardResponse> {
    const res = await fetch(`${API_BASE_URL}/dashboard`, {
    headers: {
        "Content-Type": "application/json",
        // no auth header for now
    },
    });

  if (!res.ok) {
    throw new Error(`Dashboard API error ${res.status}`);
  }

  return res.json();
}
