import {
  RecurringTransaction,
  SpendingPattern,
  CashFlowStats,
  Transaction,
} from "./types";

// Helper to calculate days between dates
const daysBetween = (d1: Date, d2: Date) => {
  return Math.abs((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
};

// Helper: Calculate Standard Deviation
const calculateStdDev = (values: number[], mean: number): number => {
  if (values.length < 2) return 0;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    (values.length - 1);
  return Math.sqrt(variance);
};

// Helper: Exponential Moving Average
const calculateEMA = (
  current: number,
  previous: number,
  alpha: number = 0.3,
): number => {
  return current * alpha + previous * (1 - alpha);
};

// Helper: Normalize Merchant Name (Fuzzy Matching)
const normalizeMerchantName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[0-9#]/g, "") // Remove numbers and hash
    .replace(/\s+(store|branch|inc|llc|ltd)\b/g, "") // Remove common suffixes
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim();
};

export class Analyzer {
  /**
   * Detect recurring transactions (bills, subscriptions, income)
   * Simple heuristic: same merchant, similar amount, regular intervals
   */
  static detectRecurring(transactions: Transaction[]): RecurringTransaction[] {
    const recurring: RecurringTransaction[] = [];
    const merchantGroups = new Map<string, Transaction[]>();

    // Group by merchant
    transactions.forEach((tx) => {
      const rawName = tx.merchant_name || tx.description;
      const key = normalizeMerchantName(rawName);

      if (!merchantGroups.has(key)) {
        merchantGroups.set(key, []);
      }
      merchantGroups.get(key)?.push(tx);
    });

    merchantGroups.forEach((txs, merchant) => {
      if (txs.length < 2) return;

      // Sort by date desc
      txs.sort(
        (a, b) =>
          new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime(),
      );

      const amounts = txs.map((t) => Number(t.amount));
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

      // Check if amounts are similar (within 10% variance)
      const isStableAmount = amounts.every(
        (a) => Math.abs(a - avgAmount) / Math.abs(avgAmount) < 0.1,
      );

      // Check intervals
      const dates = txs.map((t) => new Date(t.posted_at));
      const intervals: number[] = [];
      for (let i = 0; i < dates.length - 1; i++) {
        intervals.push(daysBetween(dates[i], dates[i + 1]));
      }

      const avgInterval =
        intervals.reduce((a, b) => a + b, 0) / intervals.length;

      let frequency: "weekly" | "monthly" | "yearly" | "irregular" =
        "irregular";
      if (Math.abs(avgInterval - 7) < 2) frequency = "weekly";
      else if (Math.abs(avgInterval - 30) < 5) frequency = "monthly";
      else if (Math.abs(avgInterval - 365) < 10) frequency = "yearly";

      if (frequency !== "irregular" || (isStableAmount && txs.length >= 3)) {
        const lastDate = new Date(txs[0].posted_at);
        const nextDate = new Date(lastDate);

        if (frequency === "weekly") nextDate.setDate(lastDate.getDate() + 7);
        else if (frequency === "monthly")
          nextDate.setMonth(lastDate.getMonth() + 1);
        else if (frequency === "yearly")
          nextDate.setFullYear(lastDate.getFullYear() + 1);
        else nextDate.setDate(lastDate.getDate() + 30); // Fallback

        // Determine type based on amount and category
        let type: "bill" | "subscription" | "income" = "bill";

        if (avgAmount > 0) {
          type = "income";
        } else {
          // Check category to distinguish bills from regular spending
          const categoryName =
            (txs[0] as any).category_name?.toLowerCase() || "";

          // Categories that indicate bills/subscriptions
          const billCategories = [
            "rent",
            "mortgage",
            "electricity",
            "gas",
            "heating",
            "water",
            "waste",
            "internet",
            "mobile",
            "phone",
            "insurance",
            "streaming",
            "subscription",
            "gym",
            "membership",
            "software",
            "app",
          ];

          const isBill = billCategories.some((keyword) =>
            categoryName.includes(keyword),
          );

          // Only mark as recurring bill if it's actually a bill category
          // Otherwise, skip it (regular spending like groceries, transport)
          if (!isBill) {
            return; // Don't include regular variable spending in recurring list
          }

          type =
            categoryName.includes("streaming") ||
            categoryName.includes("subscription")
              ? "subscription"
              : "bill";
        }

        recurring.push({
          merchantName: merchant,
          amount: avgAmount,
          frequency,
          nextExpectedDate: nextDate.toISOString(),
          confidence: isStableAmount ? 0.9 : 0.7,
          type,
        });
      }
    });

    return recurring;
  }

  /**
   * Analyze spending patterns by category
   */
  static analyzeSpending(
    transactions: Transaction[],
    categories: Map<number, string>,
  ): SpendingPattern[] {
    const patterns: SpendingPattern[] = [];
    const categoryGroups = new Map<number, Transaction[]>();

    // Group by category
    transactions.forEach((tx) => {
      if (!tx.category_id) return;
      if (!categoryGroups.has(tx.category_id)) {
        categoryGroups.set(tx.category_id, []);
      }
      categoryGroups.get(tx.category_id)?.push(tx);
    });

    categoryGroups.forEach((txs, catId) => {
      // Filter for expenses only
      const expenses = txs.filter((t) => Number(t.amount) < 0);
      if (expenses.length === 0) return;

      const totalSpent = expenses.reduce(
        (sum, t) => sum + Math.abs(Number(t.amount)),
        0,
      );

      // Calculate monthly average (assuming 3 months of data for simplicity, or based on date range)
      const dates = expenses.map((t) => new Date(t.posted_at).getTime());
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      const monthsDiff = Math.max(
        1,
        (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24 * 30),
      );

      const avgMonthly = totalSpent / monthsDiff;

      // Calculate Trend using EMA
      // We process months sequentially
      const monthlyTotals = new Map<string, number>();
      expenses.forEach((t) => {
        const d = new Date(t.posted_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        monthlyTotals.set(
          key,
          (monthlyTotals.get(key) || 0) + Math.abs(Number(t.amount)),
        );
      });

      // Sort months
      const sortedMonths = Array.from(monthlyTotals.keys()).sort();
      let emailVal = 0;
      if (sortedMonths.length > 0) {
        emailVal = monthlyTotals.get(sortedMonths[0]) || 0;
        for (let i = 1; i < sortedMonths.length; i++) {
          emailVal = calculateEMA(
            monthlyTotals.get(sortedMonths[i]) || 0,
            emailVal,
          );
        }
      }

      // Determine trend based on EMA vs Average
      let trend: "increasing" | "decreasing" | "stable" = "stable";
      if (emailVal > avgMonthly * 1.1) trend = "increasing";
      else if (emailVal < avgMonthly * 0.9) trend = "decreasing";

      // Calculate Volatility (Std Dev of monthly totals / Average)
      const monthlyValues = Array.from(monthlyTotals.values());
      const stdDev = calculateStdDev(monthlyValues, avgMonthly);
      const volatility = avgMonthly > 0 ? stdDev / avgMonthly : 0;

      patterns.push({
        categoryId: catId,
        categoryName: categories.get(catId) || "Unknown",
        averageMonthlySpend: avgMonthly,
        trend,
        volatility: Math.min(volatility, 1), // Cap at 1
        lastMonthSpend:
          monthlyTotals.get(sortedMonths[sortedMonths.length - 1]) || 0,
      });
    });

    return patterns;
  }

  /**
   * Detect anomalies using Z-Score
   */
  static detectAnomalies(
    transactions: Transaction[],
    categories: Map<number, string>,
  ): import("./types").Insight[] {
    const insights: import("./types").Insight[] = [];
    const categoryGroups = new Map<number, Transaction[]>();

    // 1. Group by category
    transactions.forEach((tx) => {
      if (!tx.category_id) return;
      if (!categoryGroups.has(tx.category_id)) {
        categoryGroups.set(tx.category_id, []);
      }
      categoryGroups.get(tx.category_id)?.push(tx);
    });

    // 2. Analyze each category
    categoryGroups.forEach((txs, catId) => {
      // Filter for expenses in last 90 days
      const now = new Date();
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(now.getDate() - 90);

      const recentExpenses = txs.filter(
        (t) => Number(t.amount) < 0 && new Date(t.posted_at) >= ninetyDaysAgo,
      );

      if (recentExpenses.length < 5) return; // Need min sample size

      const values = recentExpenses.map((t) => Math.abs(Number(t.amount)));
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = calculateStdDev(values, mean);

      if (stdDev === 0) return;

      // Check strictly recent transactions (e.g. last 7 days) for anomalies
      const recentWindow = new Date();
      recentWindow.setDate(now.getDate() - 7);

      recentExpenses.forEach((tx) => {
        if (new Date(tx.posted_at) < recentWindow) return;

        const amount = Math.abs(Number(tx.amount));
        const zScore = (amount - mean) / stdDev;

        if (zScore > 2.0) {
          const categoryName = categories.get(catId) || "Unknown";
          insights.push({
            type: "spending",
            severity: "warning",
            message: `Unusual spending detected in ${categoryName}`,
            actionable: `Transaction of €${amount.toFixed(
              2,
            )} at ${tx.merchant_name || "Merchant"} is significantly higher than your average (€${mean.toFixed(
              2,
            )}).`,
            relatedId: tx.id,
          });
        }
      });
    });

    return insights;
  }

  /**
   * Analyze cash flow (income vs expenses, savings rate)
   */
  static analyzeCashFlow(transactions: Transaction[]): CashFlowStats {
    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(now.getMonth() - 3);

    const recentTxs = transactions.filter(
      (t) => new Date(t.posted_at) >= threeMonthsAgo,
    );

    const income = recentTxs
      .filter((t) => Number(t.amount) > 0)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenses = recentTxs
      .filter((t) => Number(t.amount) < 0)
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

    const months = 3; // Fixed window for now

    return {
      averageMonthlyIncome: income / months,
      averageMonthlyExpenses: expenses / months,
      savingsRate: income > 0 ? (income - expenses) / income : 0,
      daysUntilBroke: null, // Requires balance data
      typicalLowBalance: 0, // Requires balance history
    };
  }
}
