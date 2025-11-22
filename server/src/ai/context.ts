import { FinancialProfile } from "../ml/types";

export function formatFinancialContext(profile: FinancialProfile): string {
  const sections: string[] = [];

  // Overview
  sections.push(`## Financial Overview`);
  sections.push(`- Income Stability: ${profile.traits.incomeStability}`);
  sections.push(`- Planner Type: ${profile.traits.plannerType}`);
  sections.push(`- Spend Velocity: ${profile.traits.spendVelocity}`);

  // Cash Flow
  sections.push(`\n## Cash Flow (Monthly Averages)`);
  sections.push(
    `- Income: €${profile.cashFlow.averageMonthlyIncome.toFixed(2)}`
  );
  sections.push(
    `- Expenses: €${profile.cashFlow.averageMonthlyExpenses.toFixed(2)}`
  );
  sections.push(
    `- Savings Rate: ${(profile.cashFlow.savingsRate * 100).toFixed(1)}%`
  );

  // Recurring Transactions
  if (profile.recurring.length > 0) {
    sections.push(`\n## Upcoming Bills & Income`);
    profile.recurring.slice(0, 5).forEach((tx) => {
      const emoji = tx.type === "income" ? "💰" : "💳";
      const amount =
        tx.amount > 0
          ? `+€${tx.amount.toFixed(2)}`
          : `-€${Math.abs(tx.amount).toFixed(2)}`;
      sections.push(
        `${emoji} ${tx.merchantName}: ${amount} (${
          tx.frequency
        }, next: ${new Date(tx.nextExpectedDate).toLocaleDateString()})`
      );
    });
  }

  // Spending Patterns
  if (profile.spendingPatterns.length > 0) {
    sections.push(`\n## Spending by Category (Monthly)`);
    profile.spendingPatterns
      .sort((a, b) => b.averageMonthlySpend - a.averageMonthlySpend)
      .slice(0, 5)
      .forEach((pattern) => {
        const trend =
          pattern.trend === "increasing"
            ? "📈"
            : pattern.trend === "decreasing"
            ? "📉"
            : "➡️";
        sections.push(
          `${trend} ${
            pattern.categoryName
          }: €${pattern.averageMonthlySpend.toFixed(2)}`
        );
      });
  }

  // Insights
  if (profile.insights.length > 0) {
    sections.push(`\n## Current Alerts`);
    profile.insights.forEach((insight) => {
      const emoji =
        insight.severity === "warning"
          ? "⚠️"
          : insight.severity === "critical"
          ? "🚨"
          : "ℹ️";
      sections.push(`${emoji} ${insight.message}`);
    });
  }

  return sections.join("\n");
}
