// server/src/routes/dashboard.ts
import { Router, Response } from "express";
import {
  verifyFirebaseToken,
  type AuthenticatedRequest,
} from "../middleware/verifyFirebaseToken";
import { pool } from "../db";

const router = Router();

router.get(
  "/dashboard",
  verifyFirebaseToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const firebaseUid = req.user?.uid;

      if (!firebaseUid) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // 1) Look up our internal user
      const userResult = await pool.query<{ id: string }>(
        "SELECT id FROM users WHERE firebase_uid = $1",
        [firebaseUid]
      );

      const dbUser = userResult.rows[0];

      if (!dbUser) {
        return res.status(404).json({
          error: "User not found in database for this Firebase account",
        });
      }

      const userId = dbUser.id;

      // We support both dev and prod external_account_id formats:
      //   - prod: external_account_id = userId
      //   - dev:  external_account_id = 'tool-account-' || userId
      const accountFilterSQL = `
        (a.external_account_id = $1 OR a.external_account_id = 'tool-account-' || $1)
      `;

      // -------------------------------------------------------------------
      // 2) TOTAL BALANCE (from accounts.available_balance)
      // -------------------------------------------------------------------
      type BalanceRow = { total_balance: string | null };

      const balanceResult = await pool.query<BalanceRow>(
        `
        SELECT
          COALESCE(SUM(a.available_balance), 0) AS total_balance
        FROM accounts a
        WHERE ${accountFilterSQL}
      `,
        [userId]
      );

      const totalBalance = Number(balanceResult.rows[0]?.total_balance ?? 0);

      // -------------------------------------------------------------------
      // 3) MONTH INCOME / EXPENSES (from transactions)
      // -------------------------------------------------------------------
      type FlowRow = {
        month_income: string | null;
        month_expenses: string | null;
      };

      const flowResult = await pool.query<FlowRow>(
        `
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN t.direction = 'credit'
                  AND date_trunc('month', t.posted_at) = date_trunc('month', now())
                THEN t.amount ELSE 0
              END
            ),
            0
          ) AS month_income,
          COALESCE(
            SUM(
              CASE
                WHEN t.direction = 'debit'
                  AND date_trunc('month', t.posted_at) = date_trunc('month', now())
                THEN t.amount ELSE 0
              END
            ),
            0
          ) AS month_expenses
        FROM transactions t
        JOIN accounts a ON t.account_id = a.id
        WHERE ${accountFilterSQL}
      `,
        [userId]
      );

      const monthIncome = Number(flowResult.rows[0]?.month_income ?? 0);
      const monthExpenses = Number(flowResult.rows[0]?.month_expenses ?? 0);

      // -------------------------------------------------------------------
      // 4) SPENDING BY CATEGORY (this month, debits only)
      // -------------------------------------------------------------------
      type CategoryRow = {
        category: string | null;
        amount: string | null;
      };

      const categoryResult = await pool.query<CategoryRow>(
        `
        SELECT
          COALESCE(c.name, 'Uncategorised') AS category,
          COALESCE(SUM(t.amount), 0)        AS amount
        FROM transactions t
        JOIN accounts a ON t.account_id = a.id
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE ${accountFilterSQL}
          AND t.direction = 'debit'
          AND date_trunc('month', t.posted_at) = date_trunc('month', now())
        GROUP BY c.name
        ORDER BY amount DESC
      `,
        [userId]
      );

      const spendingByCategory = categoryResult.rows.map((row) => ({
        category: row.category ?? "Uncategorised",
        amount: Number(row.amount ?? 0),
      }));

      // -------------------------------------------------------------------
      // 5) RECENT TRANSACTIONS (last 5 for this user)
      // -------------------------------------------------------------------
      type RecentRow = {
        posted_at: Date;
        merchant_name: string | null;
        category: string | null;
        amount: string;
        direction: string;
      };

      const recentResult = await pool.query<RecentRow>(
        `
        SELECT
          t.posted_at,
          t.merchant_name,
          c.name AS category,
          t.amount,
          t.direction
        FROM transactions t
        JOIN accounts a ON t.account_id = a.id
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE ${accountFilterSQL}
        ORDER BY t.posted_at DESC
        LIMIT 5
      `,
        [userId]
      );

      const recentTransactions = recentResult.rows.map((row, index) => {
        const base = Number(row.amount);
        const signed = row.direction === "debit" ? -base : base;

        return {
          id: index + 1, // simple UI id
          date: row.posted_at.toLocaleDateString("en-GB"),
          merchant: row.merchant_name ?? "Unknown",
          category: row.category ?? "Uncategorised",
          amount: signed,
        };
      });

      // -------------------------------------------------------------------
      // 6) MAIN GOAL (personal, for this user)
      //     1) Prefer favourite goal (is_favourite = TRUE)
      //     2) Otherwise pick earliest active goal for this user
      // -------------------------------------------------------------------
      type GoalRow = {
        id: string;
        name: string;
        target_amount: string;
        current_amount: string | null;
      };

      // 6a) Try favourite goal first
      const favouriteGoalResult = await pool.query<GoalRow>(
        `
        SELECT
          g.id,
          g.name,
          g.target_amount,
          COALESCE(SUM(gc.amount), 0) AS current_amount
        FROM goals g
        LEFT JOIN goal_contributions gc
          ON gc.goal_id = g.id
        WHERE g.user_id = $1
          AND g.household_id IS NULL
          AND g.status = 'active'
          AND g.is_favourite = TRUE
        GROUP BY g.id, g.name, g.target_amount
        ORDER BY g.created_at ASC
        LIMIT 1
      `,
        [userId]
      );

      let selectedGoalRow: GoalRow | null = null;

      if (favouriteGoalResult.rows.length > 0) {
        selectedGoalRow = favouriteGoalResult.rows[0];
      } else {
        // 6b) Fallback: earliest active personal goal
        const fallbackGoalResult = await pool.query<GoalRow>(
          `
          SELECT
            g.id,
            g.name,
            g.target_amount,
            COALESCE(SUM(gc.amount), 0) AS current_amount
          FROM goals g
          LEFT JOIN goal_contributions gc
            ON gc.goal_id = g.id
          WHERE g.user_id = $1
            AND g.household_id IS NULL
            AND g.status = 'active'
          GROUP BY g.id, g.name, g.target_amount
          ORDER BY g.created_at ASC
          LIMIT 1
        `,
          [userId]
        );

        if (fallbackGoalResult.rows.length > 0) {
          selectedGoalRow = fallbackGoalResult.rows[0];
        }
      }

      let mainGoal: {
        id: string | null;
        name: string;
        currentAmount: number;
        targetAmount: number;
      };

      if (selectedGoalRow) {
        mainGoal = {
          id: selectedGoalRow.id,
          name: selectedGoalRow.name,
          targetAmount: Number(selectedGoalRow.target_amount ?? 0),
          currentAmount: Number(selectedGoalRow.current_amount ?? 0),
        };
      } else {
        mainGoal = {
          id: null,
          name: "No active goals yet",
          targetAmount: 0,
          currentAmount: 0,
        };
      }

      // -------------------------------------------------------------------
      // 7) SMART INSIGHTS
      // -------------------------------------------------------------------
      const insights: string[] = [
        `Your current available balance is €${totalBalance.toFixed(2)}.`,
        `You’ve earned €${monthIncome.toFixed(2)} so far this month.`,
        `You’ve spent €${monthExpenses.toFixed(2)} so far this month.`,
      ];

      if (mainGoal.targetAmount > 0) {
        const goalProgressPct =
          (mainGoal.currentAmount / mainGoal.targetAmount) * 100;
        insights.push(
          `You’re ${goalProgressPct.toFixed(
            1
          )}% of the way towards "${mainGoal.name}".`
        );
      }

      // -------------------------------------------------------------------
      // 8) Return DashboardResponse shape
      // -------------------------------------------------------------------
      return res.json({
        summary: {
          totalBalance,
          monthIncome,
          monthExpenses,
        },
        spendingByCategory,
        recentTransactions,
        mainGoal,
        insights,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error in /api/dashboard:", error);
      return res
        .status(500)
        .json({ error: "Failed to load dashboard data" });
    }
  }
);

export default router;
