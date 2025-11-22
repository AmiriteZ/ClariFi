import { RecurringTransaction } from "./types";

export class Forecaster {
  /**
   * Project balance for the next X days
   */
  static projectBalance(
    currentBalance: number,
    recurring: RecurringTransaction[],
    avgDailySpend: number,
    days: number = 30
  ): { date: string; balance: number }[] {
    const projection: { date: string; balance: number }[] = [];
    let balance = currentBalance;
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      // 1. Subtract daily variable spend (average)
      balance -= avgDailySpend;

      // 2. Add/Subtract recurring items due on this day
      recurring.forEach((tx) => {
        const nextDate = new Date(tx.nextExpectedDate);

        // Simple check if it falls on this day (ignoring exact time)
        // For weekly/monthly, we'd need more complex logic to project multiple occurrences
        // This is a simplified version that checks if the *next* occurrence is today
        // In a real system, we'd project all future occurrences

        if (
          date.getDate() === nextDate.getDate() &&
          date.getMonth() === nextDate.getMonth() &&
          date.getFullYear() === nextDate.getFullYear()
        ) {
          if (tx.type === "income") {
            balance += tx.amount;
          } else {
            balance -= Math.abs(tx.amount);
          }
        }
      });

      projection.push({
        date: date.toISOString().split("T")[0],
        balance: Number(balance.toFixed(2)),
      });
    }

    return projection;
  }
}
