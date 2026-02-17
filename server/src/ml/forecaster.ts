import { RecurringTransaction } from "./types";

export class Forecaster {
  /**
   * Project balance for the next X days
   */
  static projectBalance(
    currentBalance: number,
    recurring: RecurringTransaction[],
    dailySpendStats: { mean: number; stdDev: number },
    days: number = 30,
  ): {
    date: string;
    expectedBalance: number;
    optimisticBalance: number;
    pessimisticBalance: number;
  }[] {
    const projection: {
      date: string;
      expectedBalance: number;
      optimisticBalance: number;
      pessimisticBalance: number;
    }[] = [];

    let expected = currentBalance;
    let optimistic = currentBalance;
    let pessimistic = currentBalance;
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      // 1. Subtract daily variable spend
      // expected: mean
      // optimistic: mean - stdDev (spending less)
      // pessimistic: mean + stdDev (spending more)
      expected -= dailySpendStats.mean;
      optimistic -= Math.max(0, dailySpendStats.mean - dailySpendStats.stdDev);
      pessimistic -= dailySpendStats.mean + dailySpendStats.stdDev;

      // 2. Add/Subtract recurring items due on this day
      recurring.forEach((tx) => {
        const nextDate = new Date(tx.nextExpectedDate);

        // Simple check if it falls on this day
        // (Note: In production, use meaningful date math for recurrence)
        if (
          date.getDate() === nextDate.getDate() &&
          date.getMonth() === nextDate.getMonth() &&
          date.getFullYear() === nextDate.getFullYear()
        ) {
          if (tx.type === "income") {
            const amt = Number(tx.amount);
            expected += amt;
            optimistic += amt;
            pessimistic += amt;
          } else {
            const amt = Math.abs(Number(tx.amount));
            expected -= amt;
            optimistic -= amt;
            pessimistic -= amt;
          }
        }
      });

      projection.push({
        date: date.toISOString().split("T")[0],
        expectedBalance: Number(expected.toFixed(2)),
        optimisticBalance: Number(optimistic.toFixed(2)),
        pessimisticBalance: Number(pessimistic.toFixed(2)),
      });
    }

    return projection;
  }
}
