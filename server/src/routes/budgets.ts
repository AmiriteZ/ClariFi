import { Router, Response } from "express";
import { pool } from "../db";
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
  owner_name: string;
  household_name: string | null;
  member_names: string[];
}

/**
 * Helper: resolve the DB user.id for the current request.
 * Uses req.user.id if present; otherwise looks up by firebase_uid.
 */
async function resolveUserId(
  req: AuthenticatedRequest
): Promise<string | null> {
  const authUser = req.user as any;

  if (!authUser) {
    return null;
  }

  if (authUser.id) {
    return authUser.id;
  }

  const firebaseUid =
    authUser.firebaseUid ?? authUser.firebase_uid ?? authUser.uid;

  if (!firebaseUid) {
    return null;
  }

  const result = await pool.query(
    `SELECT id FROM users WHERE firebase_uid = $1 LIMIT 1`,
    [firebaseUid]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].id;
}

/**
 * GET /api/budgets
 * Fetch all budgets for the user (personal + household)
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
          u.display_name as owner_name,
          h.name as household_name,
          ARRAY_AGG(DISTINCT hm_users.display_name) FILTER (WHERE hm_users.id IS NOT NULL) as member_names
        FROM budgets b
        JOIN users u ON b.user_id = u.id
        LEFT JOIN households h ON b.household_id = h.id
        LEFT JOIN household_members hm ON h.id = hm.household_id
        LEFT JOIN users hm_users ON hm.user_id = hm_users.id
        WHERE b.user_id = $1
           OR b.household_id IN (
                SELECT household_id FROM household_members WHERE user_id = $1
              )
        GROUP BY b.id, u.display_name, h.name
        ORDER BY b.created_at DESC
      `;

      const result = await pool.query<BudgetRow>(query, [userId]);

      const budgets = result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        periodType: row.period_type,
        periodStart: row.period_start,
        periodEnd: row.period_end,
        currencyCode: row.currency_code,
        createdAt: row.created_at,
        ownerName: row.owner_name,
        householdName: row.household_name,
        memberNames: row.member_names || [],
      }));

      res.json({ budgets });
    } catch (error) {
      console.error("Error fetching budgets:", error);
      res.status(500).json({ error: "Failed to fetch budgets" });
    }
  }
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

      // Default values for now
      const periodType = "monthly";
      const currencyCode = "EUR"; // Default, can be changed later
      const periodStart = new Date();
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const insertQuery = `
        INSERT INTO budgets (
          user_id,
          household_id,
          name,
          period_type,
          period_start,
          period_end,
          currency_code
        )
        VALUES ($1, NULL, $2, $3, $4, $5, $6)
        RETURNING id, name
      `;

      const result = await pool.query(insertQuery, [
        userId,
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
  }
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

      const query = `
        SELECT
          b.id,
          b.name,
          b.period_type,
          b.period_start,
          b.period_end,
          b.currency_code,
          b.created_at
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
      const budget = {
        id: row.id,
        name: row.name,
        periodType: row.period_type,
        periodStart: row.period_start,
        periodEnd: row.period_end,
        currencyCode: row.currency_code,
        createdAt: row.created_at,
      };

      res.json({ budget });
    } catch (error) {
      console.error("Error fetching budget details:", error);
      res.status(500).json({ error: "Failed to fetch budget details" });
    }
  }
);

export default router;
