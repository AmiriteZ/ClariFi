export interface RecurringTransaction {
  merchantName: string;
  amount: number;
  frequency: "weekly" | "monthly" | "yearly" | "irregular";
  nextExpectedDate: string; // ISO date
  confidence: number; // 0-1
  type: "bill" | "subscription" | "income";
}

export interface SpendingPattern {
  categoryId: number;
  categoryName: string;
  averageMonthlySpend: number;
  trend: "increasing" | "decreasing" | "stable";
  volatility: number; // 0-1, how much it fluctuates
  lastMonthSpend: number;
}

export interface CashFlowStats {
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  savingsRate: number; // 0-1
  daysUntilBroke: number | null; // Estimated days until balance hits 0
  typicalLowBalance: number; // Lowest balance in typical month
}

export interface Insight {
  type: "budget" | "goal" | "spending" | "balance";
  severity: "info" | "warning" | "critical";
  message: string;
  actionable?: string; // Suggestion for the user
  relatedId?: string; // ID of budget, goal, etc.
}

export interface FinancialProfile {
  userId: string;
  traits: {
    plannerType: "reactive" | "proactive" | "balanced";
    incomeStability: "stable" | "irregular";
    spendVelocity: "fast" | "slow" | "steady"; // How fast they spend after payday
  };
  cashFlow: CashFlowStats;
  recurring: RecurringTransaction[];
  spendingPatterns: SpendingPattern[];
  insights: Insight[];
}

export interface ConversationSuggestion {
  topic: string;
  message: string;
  context: "warning" | "praise" | "advice";
}

export interface Transaction {
  id: string;
  posted_at: string;
  description: string;
  merchant_name: string | null;
  amount: number | string;
  category_id: number | null;
  category_name?: string;
}

export interface Budget {
  id: string;
  name: string;
  limit_amount: number | string;
}

export interface Goal {
  id: string;
  name: string;
  target_amount: number | string;
  current_amount?: number | string;
  target_date?: string | null;
  priority?: "high" | "medium" | "low"; // Added for ML constraint solver
}
