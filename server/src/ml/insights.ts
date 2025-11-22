import {
  Insight,
  ConversationSuggestion,
  Transaction,
  Budget,
  Goal,
} from "./types";

export class Insights {
  /**
   * Generate insights for a specific budget
   */
  static getBudgetInsights(budget: Budget, spending: Transaction[]): Insight[] {
    const insights: Insight[] = [];
    const totalBudgeted = Number(budget.limit_amount || 0); // Assuming simple budget structure for now

    // Calculate total spent in this budget's categories
    const totalSpent = spending.reduce(
      (sum, t) => sum + Math.abs(Number(t.amount)),
      0
    );

    const percentage =
      totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

    if (percentage > 100) {
      insights.push({
        type: "budget",
        severity: "warning",
        message: `You've exceeded your ${budget.name} budget by ${(
          percentage - 100
        ).toFixed(0)}%.`,
        actionable:
          "Check your recent transactions to see where you overspent.",
        relatedId: budget.id,
      });
    } else if (percentage > 85) {
      insights.push({
        type: "budget",
        severity: "info",
        message: `You're close to the limit on your ${
          budget.name
        } budget (${percentage.toFixed(0)}%).`,
        actionable:
          "Try to limit discretionary spending for the rest of the period.",
        relatedId: budget.id,
      });
    }

    return insights;
  }

  /**
   * Generate insights for a specific goal
   */
  static getGoalInsights(goal: Goal): Insight[] {
    const insights: Insight[] = [];
    const target = Number(goal.target_amount);
    const current = Number(goal.current_amount || 0); // Need to ensure we have this data
    const percentage = target > 0 ? (current / target) * 100 : 0;

    if (percentage >= 100) {
      insights.push({
        type: "goal",
        severity: "info",
        message: `Congratulations! You've reached your goal: ${goal.name}.`,
        actionable:
          "Consider setting a new goal or moving these funds to savings.",
        relatedId: goal.id,
      });
    } else if (goal.target_date) {
      const targetDate = new Date(goal.target_date);
      const now = new Date();
      const monthsLeft =
        (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);

      if (monthsLeft > 0) {
        const neededPerMonth = (target - current) / monthsLeft;
        insights.push({
          type: "goal",
          severity: "info",
          message: `To reach ${
            goal.name
          } by ${targetDate.toLocaleDateString()}, save €${neededPerMonth.toFixed(
            0
          )}/month.`,
          relatedId: goal.id,
        });
      }
    }

    return insights;
  }

  /**
   * Generate conversation suggestions for the AI assistant
   */
  static generateSuggestions(
    insights: Insight[],
    userName: string
  ): ConversationSuggestion[] {
    const suggestions: ConversationSuggestion[] = [];

    // 1. Critical warnings first
    const warnings = insights.filter(
      (i) => i.severity === "warning" || i.severity === "critical"
    );
    if (warnings.length > 0) {
      suggestions.push({
        topic: "Financial Warning",
        message: `I noticed some issues that need attention: ${warnings[0].message}`,
        context: "warning",
      });
    }

    // 2. Positive reinforcement
    const achievements = insights.filter((i) =>
      i.message.includes("Congratulations")
    );
    if (achievements.length > 0) {
      suggestions.push({
        topic: "Goal Achievement",
        message: `Great news, ${userName}! ${achievements[0].message}`,
        context: "praise",
      });
    }

    // 3. General advice
    if (suggestions.length === 0) {
      suggestions.push({
        topic: "Financial Check-in",
        message: `Hi ${userName}, everything looks stable. Would you like to review your upcoming bills?`,
        context: "advice",
      });
    }

    return suggestions;
  }
}
