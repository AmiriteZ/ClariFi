import { Router, Response } from "express";
import { pool } from "../db";
import { DateUtils } from "../utils/dateUtils";
import {
  verifyFirebaseToken,
  AuthenticatedRequest,
} from "../middleware/verifyFirebaseToken";

const router = Router();

// All routes require auth
router.use(verifyFirebaseToken);

interface BudgetRow {
  id: string;
  name: string;
  period_type: string;
  period_start: string;
  period_end: string;
  currency_code: string;
  created_at: string;
  status: string;
  archived_at: string | null;
  parent_budget_id: string | null;
  owner_name: string;
  household_id: string | null;
  household_name: string | null;
  member_names: string[];
}

/**
 * Helper: resolve the DB user.id for the current request.
 * Uses req.user.id if present; otherwise looks up by firebase_uid.
 */
async function resolveUserId(
  req: AuthenticatedRequest,
): Promise<string | null> {
  const authUser = req.user;

  if (!authUser) {
    return null;
  }

  const firebaseUid = authUser.uid;

  if (!firebaseUid) {
    return null;
  }

  const result = await pool.query(
    `SELECT id FROM users WHERE firebase_uid = $1 LIMIT 1`,
    [firebaseUid],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].id;
}

/**
 * POST /api/budgets/renew-expired
 * Check for expired budgets with auto_renew=true and update their dates
 */
router.post(
  "/renew-expired",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = await resolveUserId(req);
      if (!userId) {
        res
          .status(401)
          .json({ error: "Unauthenticated or user not found in database" });
        return;
      }

      // Find all expired budgets with auto_renew enabled for this user
      const findExpiredQuery = `
        SELECT id, period_type, period_start, period_end, auto_renew
        FROM budgets
        WHERE user_id = $1
          AND status = 'active'
          AND auto_renew = true
          AND period_end < $2
      `;

      const expiredBudgets = await pool.query(findExpiredQuery, [
        userId,
        DateUtils.getCurrentDate(),
      ]);

      let renewedCount = 0;
      let archivedCount = 0;

      for (const budget of expiredBudgets.rows) {
        const { id, period_type, period_end } = budget;

        // Calculate next period dates
        const currentEnd = new Date(period_end);
        let newStart: Date;
        let newEnd: Date;

        // Default to monthly if not provided
        if (period_type === "monthly") {
          // Move to next month
          newStart = new Date(
            currentEnd.getFullYear(),
            currentEnd.getMonth() + 1,
            1,
          );
          newEnd = new Date(
            currentEnd.getFullYear(),
            currentEnd.getMonth() + 2,
            0,
          );
        } else if (period_type === "weekly") {
          // Move to next week
          newStart = new Date(currentEnd);
          newStart.setDate(currentEnd.getDate() + 1);
          newEnd = new Date(newStart);
          newEnd.setDate(newStart.getDate() + 6);
        } else {
          continue; // Skip if not monthly or weekly
        }

        // 1. Archive the old budget
        await pool.query(
          `UPDATE budgets 
           SET status = 'completed', archived_at = NOW(), updated_at = NOW()
           WHERE id = $1`,
          [id],
        );
        archivedCount++;

        // 2. Clone the budget for the new period
        // First, get all the budget data
        const budgetData = await pool.query(
          `SELECT * FROM budgets WHERE id = $1`,
          [id],
        );
        const oldBudget = budgetData.rows[0];

        // Create new budget with same settings but new dates
        const newBudgetResult = await pool.query(
          `INSERT INTO budgets (
            user_id, household_id, name, period_type, period_start, period_end,
            currency_code, auto_renew, status, parent_budget_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9)
          RETURNING id`,
          [
            oldBudget.user_id,
            oldBudget.household_id,
            oldBudget.name,
            oldBudget.period_type,
            newStart,
            newEnd,
            oldBudget.currency_code,
            oldBudget.auto_renew,
            id, // parent_budget_id links to old budget
          ],
        );

        const newBudgetId = newBudgetResult.rows[0].id;

        // 3. Copy budget_items (allocations) to new budget
        await pool.query(
          `INSERT INTO budget_items (budget_id, category_id, limit_amount)
           SELECT $1, category_id, limit_amount
           FROM budget_items
           WHERE budget_id = $2`,
          [newBudgetId, id],
        );

        // 4. Copy budget_members if any (Table does not exist yet)
        /*
        await pool.query(
          `INSERT INTO budget_members (budget_id, user_id, role)
           SELECT $1, user_id, role
           FROM budget_members
           WHERE budget_id = $2`,
          [newBudgetId, id]
        );
        */

        renewedCount++;
      }

      res.json({
        success: true,
        archivedCount,
        renewedCount,
        message: `${archivedCount} budget(s) archived, ${renewedCount} new budget(s) created`,
      });
    } catch (error) {
      console.error("Error renewing budgets:", error);
      res.status(500).json({ error: "Failed to renew budgets" });
    }
  },
);

/**
 * GET /api/budgets/:id/view
 * Get comprehensive budget view data including analytics, spending, and history
 */
router.get(
  "/:id/view",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = await resolveUserId(req);
      if (!userId) {
        res
          .status(401)
          .json({ error: "Unauthenticated or user not found in database" });
        return;
      }

      const budgetId = req.params.id;

      // 1. Load budget details
      // 1. Load budget details (ALLOW household members)
      const budgetQuery = await pool.query(
        `SELECT b.id, b.name, b.period_type, b.period_start, b.period_end, b.currency_code, b.user_id, b.household_id
         FROM budgets b
         WHERE b.id = $1
           AND (
             b.user_id = $2
             OR b.household_id IN (
               SELECT household_id FROM household_members WHERE user_id = $2
             )
           )`,
        [budgetId, userId],
      );

      if (budgetQuery.rows.length === 0) {
        res.status(404).json({ error: "Budget not found or access denied" });
        return;
      }

      const budget = budgetQuery.rows[0];

      // 2. Load budget items with category names
      const budgetItemsQuery = await pool.query(
        `SELECT bi.category_id, bi.limit_amount, c.name as category_name
         FROM budget_items bi
         JOIN categories c ON bi.category_id = c.id
         WHERE bi.budget_id = $1
         ORDER BY c.name`,
        [budgetId],
      );

      const budgetItems = budgetItemsQuery.rows;
      const categoryIds = budgetItems.map(
        (item: { category_id: number }) => item.category_id,
      );

      // Determine whose transactions to include
      let targetUserIds = [userId];
      if (budget.household_id) {
        // Fetch all members of the household
        const membersQuery = await pool.query(
          "SELECT user_id FROM household_members WHERE household_id = $1",
          [budget.household_id],
        );
        targetUserIds = membersQuery.rows.map((r) => r.user_id);
      }

      // 3. Calculate spending per category
      // We join accounts -> users to filter by the list of targetUserIds
      const spendingQuery = await pool.query(
        `SELECT 
          t.category_id,
          SUM(ABS(t.amount)) as spent,
          COUNT(*) as transaction_count
         FROM transactions t
         JOIN accounts a ON t.account_id = a.id
         WHERE (
           a.external_account_id = ANY($1)
           OR 
           a.external_account_id IN (SELECT 'tool-account-' || u_id FROM unnest($1::text[]) AS u_id)
         )
           AND t.posted_at >= $2
           AND t.posted_at <= $3
           AND t.direction = 'debit'
           AND t.category_id = ANY($4)
         GROUP BY t.category_id`,
        [targetUserIds, budget.period_start, budget.period_end, categoryIds],
      );

      const spendingMap = new Map();
      spendingQuery.rows.forEach(
        (row: {
          category_id: number;
          spent: string;
          transaction_count: string;
        }) => {
          spendingMap.set(row.category_id, {
            spent: parseFloat(row.spent),
            transactionCount: parseInt(row.transaction_count),
          });
        },
      );

      // 4. Build category breakdown
      let totalBudgeted = 0;
      let totalSpent = 0;

      const categories = budgetItems.map(
        (item: {
          category_id: number;
          limit_amount: string;
          category_name: string;
        }) => {
          const budgeted = parseFloat(item.limit_amount);
          const spendingData = spendingMap.get(item.category_id) || {
            spent: 0,
            transactionCount: 0,
          };
          const spent = spendingData.spent;
          const remaining = budgeted - spent;
          const percentageUsed = budgeted > 0 ? (spent / budgeted) * 100 : 0;

          totalBudgeted += budgeted;
          totalSpent += spent;

          let status: "under" | "near" | "over" | "hit" = "under";
          // Allow small floating point tolerance for exact matches
          const isAtLimit = Math.abs(budgeted - spent) < 0.01;

          if (percentageUsed > 100 && !isAtLimit) status = "over";
          else if (isAtLimit) status = "hit";
          else if (percentageUsed > 85) status = "near";

          return {
            categoryId: item.category_id,
            categoryName: item.category_name,
            budgeted,
            spent,
            remaining,
            percentageUsed,
            status,
            transactionCount: spendingData.transactionCount,
          };
        },
      );

      // 5. Load all transactions for period
      // 5. Load all transactions for period
      const transactionsQuery = await pool.query(
        `SELECT 
          t.id, t.posted_at, t.description, t.merchant_name,
          t.amount, t.category_id, t.status,
          c.name as category_name,
          a.name as account_name
         FROM transactions t
         JOIN accounts a ON t.account_id = a.id
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE (
           a.external_account_id = ANY($1)
           OR 
           a.external_account_id IN (SELECT 'tool-account-' || u_id FROM unnest($1::text[]) AS u_id)
         )
           AND t.posted_at >= $2
           AND t.posted_at <= $3
           AND t.direction = 'debit'
         ORDER BY t.posted_at DESC
         LIMIT 200`,
        [targetUserIds, budget.period_start, budget.period_end],
      );

      const transactions = transactionsQuery.rows.map(
        (row: {
          id: string;
          posted_at: string;
          description: string;
          merchant_name: string | null;
          amount: string;
          category_id: number | null;
          category_name: string | null;
          account_name: string;
          status: string;
        }) => ({
          id: row.id,
          date: row.posted_at,
          description: row.description,
          merchant: row.merchant_name || row.description,
          amount: parseFloat(row.amount),
          categoryId: row.category_id,
          categoryName: row.category_name,
          accountName: row.account_name,
          status: row.status,
        }),
      );

      // 6. Find unassigned transactions
      // 6. Find unassigned transactions
      const unassignedQuery = await pool.query(
        `SELECT t.id, t.posted_at, t.description, t.merchant_name, t.amount, a.name as account_name
         FROM transactions t
         JOIN accounts a ON t.account_id = a.id
         WHERE (
           a.external_account_id = ANY($1)
           OR 
           a.external_account_id IN (SELECT 'tool-account-' || u_id FROM unnest($1::text[]) AS u_id)
         )
           AND t.posted_at >= $2
           AND t.posted_at <= $3
           AND t.category_id IS NULL
           AND t.direction = 'debit'
         ORDER BY t.posted_at DESC
         LIMIT 50`,
        [targetUserIds, budget.period_start, budget.period_end],
      );

      const unassigned = unassignedQuery.rows.map(
        (row: {
          id: string;
          posted_at: string;
          description: string;
          merchant_name: string | null;
          amount: string;
          account_name: string;
        }) => ({
          id: row.id,
          date: row.posted_at,
          description: row.description,
          merchant: row.merchant_name || row.description,
          amount: parseFloat(row.amount),
          categoryId: null,
          categoryName: null,
          accountName: row.account_name,
          status: "posted",
        }),
      );

      // 7. Calculate analytics
      const totalRemaining = totalBudgeted - totalSpent;
      const percentageUsed =
        totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

      // Calculate period elapsed
      const periodStart = new Date(budget.period_start);
      const periodEnd = new Date(budget.period_end);
      const today = DateUtils.getCurrentDate();
      const totalDays = Math.ceil(
        (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
      );
      const daysElapsed = Math.max(
        0,
        Math.ceil(
          (today.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
        ),
      );
      const periodElapsed = Math.min(100, (daysElapsed / totalDays) * 100);

      // Burn rate and projections
      const avgDailySpend = daysElapsed > 0 ? totalSpent / daysElapsed : 0;
      const remainingDays = Math.max(0, totalDays - daysElapsed);
      const projectedSpend = totalSpent + avgDailySpend * remainingDays;
      const projectedOverage = Math.max(0, projectedSpend - totalBudgeted);

      const burnRate = periodElapsed > 0 ? percentageUsed / periodElapsed : 0;
      let healthStatus: "healthy" | "warning" | "danger" = "healthy";
      if (percentageUsed > periodElapsed + 20) {
        healthStatus = "danger";
      } else if (percentageUsed > periodElapsed + 10) {
        healthStatus = "warning";
      }

      // Biggest transactions
      const biggestTransactions = [...transactions]
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
        .slice(0, 5);

      // Over budget categories
      const overBudgetCategories = categories
        .filter(
          (cat: { status: string; categoryName: string }) =>
            cat.status === "over",
        )
        .map(
          (cat: { status: string; categoryName: string }) => cat.categoryName,
        );

      // 8. Load historical performance
      const historyQuery = await pool.query(
        `SELECT id, period_start, period_end
         FROM budgets
         WHERE user_id = $1
           AND name = $2
           AND period_type = $3
           AND period_end < $4
         ORDER BY period_start DESC
         LIMIT 6`,
        [userId, budget.name, budget.period_type, budget.period_start],
      );

      const history = await Promise.all(
        historyQuery.rows.map(
          async (histBudget: {
            id: string;
            period_start: string;
            period_end: string;
          }) => {
            // Get budget items for this historical period
            const histItemsQuery = await pool.query(
              `SELECT SUM(limit_amount) as total_budgeted
             FROM budget_items
             WHERE budget_id = $1`,
              [histBudget.id],
            );

            const histBudgeted = parseFloat(
              histItemsQuery.rows[0]?.total_budgeted || "0",
            );

            // Get spending for this historical period
            // Get spending for this historical period
            const histSpendingQuery = await pool.query(
              `SELECT SUM(ABS(t.amount)) as total_spent
             FROM transactions t
             JOIN accounts a ON t.account_id = a.id
             WHERE (
               a.external_account_id = ANY($1)
               OR 
               a.external_account_id IN (SELECT 'tool-account-' || u_id FROM unnest($1::text[]) AS u_id)
             )
               AND t.posted_at >= $2
               AND t.posted_at <= $3
               AND t.direction = 'debit'`,
              [targetUserIds, histBudget.period_start, histBudget.period_end],
            );

            const histSpent = parseFloat(
              histSpendingQuery.rows[0]?.total_spent || "0",
            );
            const histPercentage =
              histBudgeted > 0 ? (histSpent / histBudgeted) * 100 : 0;

            let histStatus: "under" | "near" | "over" | "hit" = "under";
            const isHistAtLimit = Math.abs(histBudgeted - histSpent) < 0.01;

            if (histPercentage > 100 && !isHistAtLimit) histStatus = "over";
            else if (isHistAtLimit) histStatus = "hit";
            else if (histPercentage > 85) histStatus = "near";

            return {
              budgetId: histBudget.id,
              periodStart: histBudget.period_start,
              periodEnd: histBudget.period_end,
              totalBudgeted: histBudgeted,
              totalSpent: histSpent,
              percentageUsed: histPercentage,
              status: histStatus,
            };
          },
        ),
      );

      // 9. Return comprehensive response
      res.json({
        budget: {
          id: budget.id,
          name: budget.name,
          periodType: budget.period_type,
          periodStart: budget.period_start,
          periodEnd: budget.period_end,
          currencyCode: budget.currency_code,
        },
        summary: {
          totalBudgeted,
          totalSpent,
          totalRemaining,
          percentageUsed,
          periodElapsed,
        },
        categories,
        transactions,
        analytics: {
          biggestTransactions,
          overBudgetCategories,
          projectedSpend,
          projectedOverage,
          burnRate,
          healthStatus,
        },
        unassigned,
        history,
      });
    } catch (error) {
      console.error("Error fetching budget view:", error);
      res.status(500).json({ error: "Failed to fetch budget view" });
    }
  },
);

/**
 * GET /api/budgets?status=active|completed
 * Fetch all budgets for the user (personal + household)
 * Optional status filter: active (default) or completed
 */
router.get(
  "/",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = await resolveUserId(req);
      if (!userId) {
        res
          .status(401)
          .json({ error: "Unauthenticated or user not found in database" });
        return;
      }

      // Get status filter from query params (default to 'active')
      const status = (req.query.status as string) || "active";

      // Validate status
      if (!["active", "completed", "all"].includes(status)) {
        res.status(400).json({
          error: "Invalid status. Must be 'active', 'completed', or 'all'",
        });
        return;
      }

      // Fetch budgets where user is owner OR user is part of the household
      const query = `
        SELECT
          b.id,
          b.name,
          b.period_type,
          b.period_start,
          b.period_end,
          b.currency_code,
          b.created_at,
          b.status,
          b.archived_at,
          b.parent_budget_id,
          u.display_name as owner_name,
          h.name as household_name,
          ARRAY_AGG(DISTINCT hm_users.display_name) FILTER (WHERE hm_users.id IS NOT NULL) as member_names
        FROM budgets b
        JOIN users u ON b.user_id = u.id
        LEFT JOIN households h ON b.household_id = h.id
        LEFT JOIN household_members hm ON h.id = hm.household_id
        LEFT JOIN users hm_users ON hm.user_id = hm_users.id
        WHERE (b.user_id = $1
           OR b.household_id IN (
                SELECT household_id FROM household_members WHERE user_id = $1
              ))
          ${status !== "all" ? "AND b.status = $2" : ""}
        GROUP BY b.id, b.household_id, u.display_name, h.name
        ORDER BY b.created_at DESC
      `;

      const params = status !== "all" ? [userId, status] : [userId];
      const result = await pool.query<BudgetRow>(query, params);

      const budgets = result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        periodType: row.period_type,
        periodStart: row.period_start,
        periodEnd: row.period_end,
        currencyCode: row.currency_code,
        createdAt: row.created_at,
        status: row.status,
        archivedAt: row.archived_at,
        parentBudgetId: row.parent_budget_id,
        ownerName: row.owner_name,
        householdName: row.household_name,
        householdId: row.household_id,
        memberNames: row.member_names || [],
      }));

      res.json({ budgets });
    } catch (error) {
      console.error("Error fetching budgets:", error);
      res.status(500).json({ error: "Failed to fetch budgets" });
    }
  },
);

/**
 * POST /api/budgets
 * Create a new budget (Name only first)
 */
router.post(
  "/",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = await resolveUserId(req);
      if (!userId) {
        res
          .status(401)
          .json({ error: "Unauthenticated or user not found in database" });
        return;
      }

      const { name } = req.body;

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        res.status(400).json({ error: "Budget name is required" });
        return;
      }

      // Default values
      const currencyCode = "EUR"; // Default, can be changed later

      // Determine period type and dates
      const periodType = req.body.periodType || "monthly";
      let periodStart: Date;
      let periodEnd: Date;

      if (req.body.periodStart && req.body.periodEnd) {
        periodStart = new Date(req.body.periodStart);
        periodEnd = new Date(req.body.periodEnd);
      } else {
        const today = DateUtils.getCurrentDate();

        if (periodType === "monthly") {
          // Snap to first and last day of current month
          periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
          periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        } else if (periodType === "weekly") {
          // Snap to start of week (Monday)
          const day = today.getDay();
          const diff = today.getDate() - day + (day === 0 ? -6 : 1);
          periodStart = new Date(today);
          periodStart.setDate(diff);

          periodEnd = new Date(periodStart);
          periodEnd.setDate(periodStart.getDate() + 6);
        } else {
          // Fallback
          periodStart = new Date(today);
          periodEnd = new Date(today);
          periodEnd.setDate(periodEnd.getDate() + 30);
        }
      }

      // 1. Determine household context
      const householdId = req.body.householdId || null; // Optional
      if (householdId) {
        const memberCheck = await pool.query(
          "SELECT 1 FROM household_members WHERE household_id = $1 AND user_id = $2",
          [householdId, userId],
        );
        if (memberCheck.rows.length === 0) {
          res.status(403).json({ error: "Not a member of this household" });
          return;
        }
      }

      const insertQuery = `
        INSERT INTO budgets (
          user_id,
          household_id,
          name,
          period_type,
          period_start,
          period_end,
          period_end,
          currency_code
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, name
      `;
      // Note: we have a typo in original insert (period_end twice?) or just missing column in original?
      // Original: VALUES ($1, NULL, $2, $3, $4, $5, $6) -> 7 params
      // Insert columns: user_id, household_id, name, period_type, period_start, period_end, currency_code -> 7 cols
      // New: usage of householdId arg
      const finalInsertQuery = `
         INSERT INTO budgets (
           user_id,
           household_id,
           name,
           period_type,
           period_start,
           period_end,
           currency_code
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name
      `;

      const result = await pool.query(finalInsertQuery, [
        userId,
        householdId,
        name.trim(),
        periodType,
        periodStart,
        periodEnd,
        currencyCode,
      ]);

      const newBudget = result.rows[0];

      res.status(201).json({ budget: newBudget });
    } catch (error) {
      console.error("Error creating budget:", error);
      res.status(500).json({ error: "Failed to create budget" });
    }
  },
);

/**
 * GET /api/budgets/:id
 * Fetch budget details
 */
router.get(
  "/:id",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = await resolveUserId(req);
      if (!userId) {
        res
          .status(401)
          .json({ error: "Unauthenticated or user not found in database" });
        return;
      }

      const budgetId = req.params.id;

      // 1. Fetch budget details
      const query = `
        SELECT
          b.id,
          b.name,
          b.period_type,
          b.period_start,
          b.period_end,
          b.currency_code,
          b.created_at,
          b.income_amount,
          b.savings_target_amount,
          b.savings_target_type,
          b.auto_renew
        FROM budgets b
        WHERE b.id = $1
          AND (b.user_id = $2 OR b.household_id IN (
            SELECT household_id FROM household_members WHERE user_id = $2
          ))
      `;

      const result = await pool.query(query, [budgetId, userId]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Budget not found" });
        return;
      }

      const row = result.rows[0];

      // 2. Fetch selected accounts
      const accountsQuery = `
        SELECT account_id FROM budget_accounts WHERE budget_id = $1
      `;
      const accountsResult = await pool.query(accountsQuery, [budgetId]);
      const accountIds = accountsResult.rows.map((r) => r.account_id);

      // 3. Fetch category limits
      const limitsQuery = `
        SELECT category_id, limit_amount FROM budget_items WHERE budget_id = $1
      `;
      const limitsResult = await pool.query(limitsQuery, [budgetId]);
      const categoryLimits = limitsResult.rows.map((r) => ({
        categoryId: r.category_id,
        amount: parseFloat(r.limit_amount),
      }));

      const budget = {
        id: row.id,
        name: row.name,
        periodType: row.period_type,
        periodStart: row.period_start,
        periodEnd: row.period_end,
        currencyCode: row.currency_code,
        createdAt: row.created_at,
        incomeAmount: row.income_amount ? parseFloat(row.income_amount) : null,
        savingsTargetAmount: row.savings_target_amount
          ? parseFloat(row.savings_target_amount)
          : null,
        savingsTargetType: row.savings_target_type,
        autoRenew: row.auto_renew,
        accountIds,
        categoryLimits,
      };

      res.json({ budget });
    } catch (error) {
      console.error("Error fetching budget details:", error);
      res.status(500).json({ error: "Failed to fetch budget details" });
    }
  },
);

/**
 * GET /api/budgets/:id/accounts
 * Fetch user's accounts for budget selection
 */
router.get(
  "/:id/accounts",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = await resolveUserId(req);
      if (!userId) {
        res
          .status(401)
          .json({ error: "Unauthenticated or user not found in database" });
        return;
      }

      // Fetch all accounts belonging to the user
      const query = `
        SELECT
          a.id,
          a.name,
          a.account_type,
          a.currency_code,
          a.current_balance,
          a.masked_account_ref
        FROM accounts a
        JOIN bank_connections bc ON a.bank_connection_id = bc.id
        WHERE bc.user_id = $1
        ORDER BY a.name
      `;

      const result = await pool.query(query, [userId]);

      const accounts = result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        accountType: row.account_type,
        currencyCode: row.currency_code,
        currentBalance: row.current_balance,
        maskedRef: row.masked_account_ref,
      }));

      res.json({ accounts });
    } catch (error) {
      console.error("Error fetching accounts:", error);
      res.status(500).json({ error: "Failed to fetch accounts" });
    }
  },
);

/**
 * GET /api/budgets/:id/categories
 * Fetch leaf expense categories grouped by parent for budget limit entry
 */
router.get(
  "/:id/categories",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = await resolveUserId(req);
      if (!userId) {
        res
          .status(401)
          .json({ error: "Unauthenticated or user not found in database" });
        return;
      }

      // Fetch only leaf expense categories using the view
      const query = `
        SELECT
          id,
          name,
          parent_id AS "parentId",
          parent_name AS "parentName"
        FROM vw_budget_leaf_categories
        ORDER BY parent_name, name
      `;

      const result = await pool.query(query);

      // Group categories by parent
      const groupsMap = new Map<string, Array<{ id: number; name: string }>>();

      for (const row of result.rows) {
        const parentLabel = row.parentName ?? "Other Expenses";
        if (!groupsMap.has(parentLabel)) {
          groupsMap.set(parentLabel, []);
        }
        groupsMap.get(parentLabel)!.push({ id: row.id, name: row.name });
      }

      const categoryGroups = Array.from(groupsMap.entries()).map(
        ([parent, items]) => ({
          parent,
          items,
        }),
      );

      res.json({ categoryGroups });
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  },
);

/**
 * PATCH /api/budgets/:id/setup
 * Save budget setup configuration (period, accounts, category limits, savings)
 */
router.patch(
  "/:id/setup",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = await resolveUserId(req);
      if (!userId) {
        res
          .status(401)
          .json({ error: "Unauthenticated or user not found in database" });
        return;
      }

      const budgetId = req.params.id;
      const {
        periodType,
        periodStart,
        periodEnd,
        accountIds,
        categoryLimits,
        incomeAmount,
        savingsTargetAmount,
        savingsTargetType,
        autoRenew,
      } = req.body;

      // Verify budget ownership
      const ownerCheck = await pool.query(
        `SELECT id FROM budgets WHERE id = $1 AND user_id = $2`,
        [budgetId, userId],
      );

      if (ownerCheck.rows.length === 0) {
        res.status(404).json({ error: "Budget not found or access denied" });
        return;
      }

      // Start transaction
      await pool.query("BEGIN");

      try {
        // Update budget period and savings
        const updateBudgetQuery = `
          UPDATE budgets
          SET
            period_type = $1,
            period_start = $2,
            period_end = $3,
            income_amount = $4,
            savings_target_amount = $5,
            savings_target_type = $6,
            auto_renew = $7,
            updated_at = now()
          WHERE id = $8
        `;

        await pool.query(updateBudgetQuery, [
          periodType,
          periodStart,
          periodEnd,
          incomeAmount || null,
          savingsTargetAmount || null,
          savingsTargetType || null,
          autoRenew || false,
          budgetId,
        ]);

        // Delete existing account associations
        await pool.query(`DELETE FROM budget_accounts WHERE budget_id = $1`, [
          budgetId,
        ]);

        // Insert new account associations
        if (accountIds && accountIds.length > 0) {
          const accountValues = accountIds
            .map((accountId: string, idx: number) => `($1, $${idx + 2})`)
            .join(", ");

          await pool.query(
            `INSERT INTO budget_accounts (budget_id, account_id) VALUES ${accountValues}`,
            [budgetId, ...accountIds],
          );
        }

        // Delete existing category limits
        await pool.query(`DELETE FROM budget_items WHERE budget_id = $1`, [
          budgetId,
        ]);

        // Insert new category limits
        if (categoryLimits && categoryLimits.length > 0) {
          for (const limit of categoryLimits) {
            if (limit.amount && limit.amount > 0) {
              await pool.query(
                `INSERT INTO budget_items (budget_id, category_id, limit_amount) VALUES ($1, $2, $3)`,
                [budgetId, limit.categoryId, limit.amount],
              );
            }
          }
        }

        await pool.query("COMMIT");

        res.json({ success: true, message: "Budget setup saved successfully" });
      } catch (error) {
        await pool.query("ROLLBACK");
        throw error;
      }
    } catch (error) {
      console.error("Error saving budget setup:", error);
      res.status(500).json({ error: "Failed to save budget setup" });
    }
  },
);

/**
 * DELETE /api/budgets/:id
 * Delete a budget and all its related data
 */
router.delete(
  "/:id",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = await resolveUserId(req);
      if (!userId) {
        res
          .status(401)
          .json({ error: "Unauthenticated or user not found in database" });
        return;
      }

      const budgetId = req.params.id;

      // Verify budget belongs to user
      const ownerCheck = await pool.query(
        "SELECT id FROM budgets WHERE id = $1 AND user_id = $2",
        [budgetId, userId],
      );

      if (ownerCheck.rows.length === 0) {
        res.status(404).json({ error: "Budget not found" });
        return;
      }

      // Delete budget (cascading deletes will handle related records)
      await pool.query("DELETE FROM budgets WHERE id = $1", [budgetId]);

      res.json({ success: true, message: "Budget deleted successfully" });
    } catch (error) {
      console.error("Error deleting budget:", error);
      res.status(500).json({ error: "Failed to delete budget" });
    }
  },
);

export default router;
