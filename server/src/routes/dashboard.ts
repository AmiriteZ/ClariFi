// server/src/routes/dashboard.ts
import { Router, Response } from "express";
import {
  verifyFirebaseToken,
  type AuthenticatedRequest,
} from "../middleware/verifyFirebaseToken";
import { pool } from "../db";
import { DateUtils } from "../utils/dateUtils";

const router = Router();

interface FlowRow {
  month_income: string | null;
  month_expenses: string | null;
}

interface CategoryRow {
  category: string | null;
  amount: string | null;
}

interface RecentRow {
  posted_at: Date;
  merchant_name: string | null;
  category: string | null;
  amount: string;
  direction: string;
}

interface GoalRow {
  id: string;
  name: string;
  target_amount: string;
  current_amount: string | null;
}

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
        [firebaseUid],
      );

      const dbUser = userResult.rows[0];

      if (!dbUser) {
        return res.status(404).json({
          error: "User not found in database for this Firebase account",
        });
      }

      const userId = dbUser.id;

      const householdId = (req.query.householdId as string) || null;
      let targetUserIds = [userId];

      if (householdId) {
        // Verify membership
        const memberCheck = await pool.query(
          "SELECT 1 FROM household_members WHERE household_id = $1 AND user_id = $2",
          [householdId, userId],
        );

        if (memberCheck.rows.length === 0) {
          return res
            .status(403)
            .json({ error: "Access denied to this household" });
        }

        // Fetch all members of the household
        const membersQuery = await pool.query(
          "SELECT user_id FROM household_members WHERE household_id = $1",
          [householdId],
        );

        targetUserIds = membersQuery.rows.map((r) => r.user_id);
      }

      // We support both dev and prod external_account_id formats:
      // prod: external_account_id = userId
      // dev:  external_account_id = 'tool-account-' || userId
      // UPDATED: Now filters by ANY of the targetUserIds
      const accountFilterSQL = `
        (
          a.external_account_id = ANY($1)
          OR 
          a.external_account_id IN (SELECT 'tool-account-' || u_id FROM unnest($1::text[]) AS u_id)
        )
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
        [targetUserIds],
      );

      const totalBalance = Number(balanceResult.rows[0]?.total_balance ?? 0);

      const flowResult = await pool.query<FlowRow>(
        `
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN t.direction = 'credit'
                  AND date_trunc('month', t.posted_at) = date_trunc('month', $2::timestamp)
                THEN t.amount ELSE 0
              END
            ),
            0
          ) AS month_income,
          COALESCE(
            SUM(
              CASE
                WHEN t.direction = 'debit'
                  AND date_trunc('month', t.posted_at) = date_trunc('month', $2::timestamp)
                THEN t.amount ELSE 0
              END
            ),
            0
          ) AS month_expenses
        FROM transactions t
        JOIN accounts a ON t.account_id = a.id
        WHERE ${accountFilterSQL}
      `,
        [targetUserIds, DateUtils.getCurrentDate()],
      );

      const monthIncome = Number(flowResult.rows[0]?.month_income ?? 0);
      const monthExpenses = Number(flowResult.rows[0]?.month_expenses ?? 0);

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
          AND date_trunc('month', t.posted_at) = date_trunc('month', $2::timestamp)
        GROUP BY c.name
        ORDER BY amount DESC
      `,
        [targetUserIds, DateUtils.getCurrentDate()],
      );

      const spendingByCategory = categoryResult.rows.map((row) => ({
        category: row.category ?? "Uncategorised",
        amount: Number(row.amount ?? 0),
      }));

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
        [targetUserIds],
      );

      // ... existing mapping code ...

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

      // 6. Main Goal Logic (Household vs Personal)
      let selectedGoalRow: GoalRow | null = null;
      let goalQuery = "";
      let goalParams: any[] = [];

      if (householdId) {
        // Household Goal Strategy: Earliest active household goal (we don't track favourite household goals yet per se, or maybe we do?)
        // Let's pick earliest active household goal
        goalQuery = `
          SELECT
            g.id,
            g.name,
            g.target_amount,
            COALESCE(SUM(gc.amount), 0) AS current_amount
          FROM goals g
          LEFT JOIN goal_contributions gc ON gc.goal_id = g.id
          WHERE g.household_id = $1
            AND g.status = 'active'
          GROUP BY g.id, g.name, g.target_amount
          ORDER BY g.created_at ASC
          LIMIT 1
         `;
        goalParams = [householdId];
      } else {
        // Personal Goal Strategy: Favourite > Earliest Active
        goalQuery = `
          SELECT
            g.id,
            g.name,
            g.target_amount,
            COALESCE(SUM(gc.amount), 0) AS current_amount
          FROM goals g
          LEFT JOIN goal_contributions gc ON gc.goal_id = g.id
          WHERE g.user_id = $1
            AND g.household_id IS NULL
            AND g.status = 'active'
          GROUP BY g.id, g.name, g.target_amount
          ORDER BY g.is_favourite DESC, g.created_at ASC
          LIMIT 1
         `;
        goalParams = [userId];
      }

      const goalResult = await pool.query<GoalRow>(goalQuery, goalParams);

      if (goalResult.rows.length > 0) {
        selectedGoalRow = goalResult.rows[0];
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
          `You’re ${goalProgressPct.toFixed(1)}% of the way towards "${
            mainGoal.name
          }".`,
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
      return res.status(500).json({ error: "Failed to load dashboard data" });
    }
  },
);

export default router;
