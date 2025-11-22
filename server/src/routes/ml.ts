import { Router, Response } from "express";
import { pool } from "../db";
import {
  verifyFirebaseToken,
  AuthenticatedRequest,
} from "../middleware/verifyFirebaseToken";
import { Analyzer } from "../ml/analyzer";
import { Insights } from "../ml/insights";
import { Forecaster } from "../ml/forecaster";
import { FinancialProfile } from "../ml/types";

const router = Router();

// All routes require auth
router.use(verifyFirebaseToken);

/**
 * Helper: resolve the DB user.id for the current request.
 */
async function resolveUserId(
  req: AuthenticatedRequest
): Promise<string | null> {
  const authUser = req.user;
  if (!authUser) return null;

  const firebaseUid = authUser.uid;
  if (!firebaseUid) return null;

  const result = await pool.query(
    `SELECT id FROM users WHERE firebase_uid = $1 LIMIT 1`,
    [firebaseUid]
  );

  if (result.rows.length === 0) return null;
  return result.rows[0].id;
}

/**
 * GET /api/ml/snapshot
 * Get a comprehensive financial snapshot for the user
 */
router.get(
  "/snapshot",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = await resolveUserId(req);
      if (!userId) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
      }

      // 1. Fetch recent transactions (last 90 days)
      const txQuery = await pool.query(
        `SELECT t.*, c.name as category_name
         FROM transactions t
         JOIN accounts a ON t.account_id = a.id
         JOIN bank_connections bc ON a.bank_connection_id = bc.id
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE bc.user_id = $1
           AND t.posted_at >= NOW() - INTERVAL '90 days'
         ORDER BY t.posted_at DESC`,
        [userId]
      );
      const transactions = txQuery.rows;

      // 2. Fetch categories map
      const catQuery = await pool.query("SELECT id, name FROM categories");
      const categories = new Map<number, string>();
      catQuery.rows.forEach((c) => categories.set(c.id, c.name));

      // 3. Run Analysis
      const recurring = Analyzer.detectRecurring(transactions);
      const spendingPatterns = Analyzer.analyzeSpending(
        transactions,
        categories
      );
      const cashFlow = Analyzer.analyzeCashFlow(transactions);

      // 4. Run Forecaster
      // Calculate average daily spend (simple heuristic)
      const totalSpent = transactions
        .filter((t) => Number(t.amount) < 0)
        .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
      const days = 90;
      const avgDailySpend = totalSpent / days;

      // Get current balance from accounts (sum of all)
      const accountsRes = await pool.query(
        `SELECT SUM(current_balance) as total 
         FROM accounts a 
         JOIN bank_connections bc ON a.bank_connection_id = bc.id
         WHERE bc.user_id = $1`,
        [userId]
      );
      const currentBalance = Number(accountsRes.rows[0]?.total || 0);

      const forecast = Forecaster.projectBalance(
        currentBalance,
        recurring,
        avgDailySpend,
        30
      );

      // 5. Generate Insights
      // (In a real app, we'd fetch budgets/goals here too)
      const insights: any[] = [];
      if (cashFlow.savingsRate < 0) {
        insights.push({
          type: "balance",
          severity: "warning",
          message: "You are spending more than you earn on average.",
          actionable: "Review your recurring subscriptions.",
        });
      }

      // 6. Build Profile
      const profile: FinancialProfile & { forecast: any[] } = {
        userId,
        traits: {
          plannerType: "balanced", // Placeholder logic
          incomeStability: recurring.some((t) => t.type === "income")
            ? "stable"
            : "irregular",
          spendVelocity: "steady",
        },
        cashFlow,
        recurring,
        spendingPatterns,
        insights,
        forecast,
      };

      res.json(profile);
    } catch (error) {
      console.error("Error generating ML snapshot:", error);
      res.status(500).json({ error: "Failed to generate snapshot" });
    }
  }
);

/**
 * GET /api/ml/budgets/:id/insights
 */
router.get(
  "/budgets/:id/insights",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = await resolveUserId(req);
      if (!userId) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
      }
      const budgetId = req.params.id;

      // Fetch budget
      const budgetRes = await pool.query(
        "SELECT * FROM budgets WHERE id = $1 AND user_id = $2",
        [budgetId, userId]
      );
      if (budgetRes.rows.length === 0) {
        res.status(404).json({ error: "Budget not found" });
        return;
      }
      const budget = budgetRes.rows[0];

      // Fetch spending for this budget
      // (Simplified: fetching all transactions for period)
      const txRes = await pool.query(
        `SELECT t.* 
         FROM transactions t
         JOIN accounts a ON t.account_id = a.id
         JOIN bank_connections bc ON a.bank_connection_id = bc.id
         WHERE bc.user_id = $1
           AND t.posted_at >= $2 AND t.posted_at <= $3`,
        [userId, budget.period_start, budget.period_end]
      );

      const insights = Insights.getBudgetInsights(budget, txRes.rows);
      res.json({ insights });
    } catch (error) {
      console.error("Error generating budget insights:", error);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  }
);

/**
 * POST /api/ml/suggestions
 * Generate conversation starters
 */
router.post(
  "/suggestions",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = await resolveUserId(req);
      if (!userId) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
      }

      const { context } = req.body; // e.g., "dashboard", "goal_view"
      console.log(`Generating suggestions for context: ${context}`);

      // For now, generate generic suggestions based on snapshot
      // In future, use context to filter

      // Reuse snapshot logic (simplified)
      const txQuery = await pool.query(
        `SELECT t.* 
         FROM transactions t
         JOIN accounts a ON t.account_id = a.id
         JOIN bank_connections bc ON a.bank_connection_id = bc.id
         WHERE bc.user_id = $1
           AND t.posted_at >= NOW() - INTERVAL '30 days'`,
        [userId]
      );

      const cashFlow = Analyzer.analyzeCashFlow(txQuery.rows);
      const insights = [];

      if (cashFlow.savingsRate > 0.2) {
        insights.push({
          type: "balance",
          severity: "info",
          message: "Congratulations on a high savings rate this month!",
        });
      }

      const suggestions = Insights.generateSuggestions(
        insights as any[],
        "User"
      );
      res.json({ suggestions });
    } catch (error) {
      console.error("Error generating suggestions:", error);
      res.status(500).json({ error: "Failed to generate suggestions" });
    }
  }
);

export default router;
