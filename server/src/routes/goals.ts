// server/src/routes/goals.ts
import { Router, Response } from "express";
import { pool } from "../db";
import {
  verifyFirebaseToken,
  AuthenticatedRequest,
} from "../middleware/verifyFirebaseToken";

const router = Router();

interface GoalSummaryRow {
  id: string;
  name: string;
  target_amount: string;
  currency_code: string;
  target_date: string | null;
  status: string;
  total_contributed: string | null;
  created_at: string;
  is_favourite: boolean;
}

interface CategoryIdRow {
  id: number;
}

interface UserIdRow {
  id: string;
}

interface CreateGoalBody {
  name: string;
  targetAmount: number;
  currencyCode: string;
  targetDate?: string;
  categoryName?: string;
  householdId?: string;
}

// Shape we *might* have on req.user
type MaybeAuthUser = {
  id?: string;
  uid?: string;
  firebaseUid?: string;
  firebase_uid?: string;
};

/**
 * Helper: resolve the DB user.id for the current request.
 * Uses req.user.id if present; otherwise looks up by firebase_uid.
 */
async function resolveUserId(
  req: AuthenticatedRequest,
): Promise<string | null> {
  const authUser = req.user as MaybeAuthUser | undefined;

  if (!authUser) {
    return null;
  }

  // 1) If middleware already set a DB id, use it
  if (authUser.id) {
    return authUser.id;
  }

  // 2) Otherwise, try to resolve from Firebase UID
  const firebaseUid =
    authUser.firebaseUid ?? authUser.firebase_uid ?? authUser.uid;

  if (!firebaseUid) {
    return null;
  }

  const result = await pool.query<UserIdRow>(
    `
      SELECT id
      FROM users
      WHERE firebase_uid = $1
      LIMIT 1
    `,
    [firebaseUid],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].id;
}

// All routes require auth
router.use(verifyFirebaseToken);

/**
 * GET /api/goals
 * Return personal goals for the logged-in user
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

      const householdId = (req.query.householdId as string) || null;

      let whereClause = "g.user_id = $1 AND g.household_id IS NULL";
      const params: (string | number | null)[] = [userId];

      if (householdId) {
        // Verify membership
        const memberCheck = await pool.query(
          "SELECT 1 FROM household_members WHERE household_id = $1 AND user_id = $2",
          [householdId, userId],
        );
        if (memberCheck.rows.length === 0) {
          res.status(403).json({ error: "Access denied to this household" });
          return;
        }
        whereClause = "g.household_id = $1";
        params.length = 0; // Clear params
        params.push(householdId);
      }

      const goalsQuery = `
        SELECT
          g.id,
          g.name,
          g.target_amount,
          g.currency_code,
          g.target_date,
          g.status,
          g.created_at,
          g.is_favourite,
          COALESCE(SUM(gc.amount), 0) AS total_contributed
        FROM goals g
        LEFT JOIN goal_contributions gc
          ON gc.goal_id = g.id
        WHERE ${whereClause}
        GROUP BY g.id
        ORDER BY g.created_at ASC
      `;

      const goalsResult = await pool.query<GoalSummaryRow>(goalsQuery, params);

      const goals = goalsResult.rows.map((row) => {
        const targetAmount = Number(row.target_amount);
        const totalContributed = Number(row.total_contributed ?? 0);
        const percentComplete =
          targetAmount > 0 ? (totalContributed / targetAmount) * 100 : 0;

        return {
          id: row.id,
          name: row.name,
          targetAmount,
          currencyCode: row.currency_code,
          targetDate: row.target_date,
          status: row.status,
          totalContributed,
          percentComplete,
          isFavourite: row.is_favourite, // ⬅️ NEW
        };
      });

      res.json({ householdId: null, goals });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error fetching goals:", error);
      res.status(500).json({ error: "Failed to fetch goals" });
    }
  },
);

/**
 * POST /api/goals
 * Create a personal goal owned by the current user (no household yet)
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

      const body = req.body as CreateGoalBody;
      const { name, targetAmount, currencyCode, targetDate, categoryName } =
        body;

      if (
        !name ||
        typeof name !== "string" ||
        !targetAmount ||
        Number.isNaN(targetAmount) ||
        targetAmount <= 0 ||
        !currencyCode ||
        currencyCode.length !== 3
      ) {
        res.status(400).json({
          error:
            "Missing or invalid fields. Expect name, targetAmount (>0), currencyCode (3 letters).",
        });
        return;
      }

      // Resolve categoryName -> categories.id (type = 'expense'), optional
      let categoryId: number | null = null;

      if (categoryName && categoryName.trim().length > 0) {
        const catResult = await pool.query<CategoryIdRow>(
          `
          SELECT id
          FROM categories
          WHERE name = $1
            AND type = 'expense'
          LIMIT 1
          `,
          [categoryName],
        );

        if (catResult.rows.length > 0) {
          categoryId = catResult.rows[0].id;
        }
      }

      // 0. Handle Household Context
      const householdId = req.body.householdId || null;
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
        INSERT INTO goals (
          user_id,
          household_id,
          name,
          target_amount,
          currency_code,
          target_date,
          category_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, name, target_amount, currency_code, target_date, status, created_at
      `;

      const values = [
        userId, // ✅ user_id
        householdId,
        name.trim(),
        targetAmount,
        currencyCode.toUpperCase(),
        targetDate ?? null,
        categoryId,
      ];

      const insertResult = await pool.query<GoalSummaryRow>(
        insertQuery,
        values,
      );
      const row = insertResult.rows[0];

      const createdGoal = {
        id: row.id,
        name: row.name,
        targetAmount: Number(row.target_amount),
        currencyCode: row.currency_code,
        targetDate: row.target_date,
        status: row.status,
        totalContributed: 0,
        percentComplete: 0,
      };

      res.status(201).json({ householdId: null, goal: createdGoal });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error creating goal:", error);
      res.status(500).json({ error: "Failed to create goal" });
    }
  },
);

router.post(
  "/:id/favourite",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = await resolveUserId(req);

      if (!userId) {
        res
          .status(401)
          .json({ error: "Unauthenticated or user not found in database" });
        return;
      }

      const goalId = req.params.id;

      // 1) Clear any existing favourites for this user's personal goals
      await pool.query(
        `
        UPDATE goals
        SET is_favourite = FALSE
        WHERE user_id = $1
          AND household_id IS NULL
        `,
        [userId],
      );

      // 2) Set the requested goal as favourite (only if owned by this user)
      const favResult = await pool.query<GoalSummaryRow>(
        `
        UPDATE goals
        SET is_favourite = TRUE
        WHERE id = $1
          AND user_id = $2
          AND household_id IS NULL
        RETURNING
          id,
          name,
          target_amount,
          currency_code,
          target_date,
          status,
          created_at,
          is_favourite,
          0::numeric AS total_contributed
        `,
        [goalId, userId],
      );

      if (favResult.rows.length === 0) {
        res.status(404).json({ error: "Goal not found" });
        return;
      }

      const row = favResult.rows[0];

      const updated = {
        id: row.id,
        name: row.name,
        targetAmount: Number(row.target_amount),
        currencyCode: row.currency_code,
        targetDate: row.target_date,
        status: row.status,
        totalContributed: 0,
        percentComplete: 0, // you can recompute on frontend if needed
        isFavourite: row.is_favourite,
      };

      res.json({ goal: updated });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error setting favourite goal:", error);
      res.status(500).json({ error: "Failed to set favourite goal" });
    }
  },
);

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

      const goalId = req.params.id;

      type GoalDetailRow = {
        id: string;
        name: string;
        target_amount: string;
        currency_code: string;
        target_date: string | null;
        status: string;
        is_favourite: boolean;
        created_at: string;
        total_contributed: string | null;
      };

      // 1) Fetch goal + aggregated contribution amount
      const goalResult = await pool.query<GoalDetailRow>(
        `
        SELECT
          g.id,
          g.name,
          g.target_amount,
          g.currency_code,
          g.target_date,
          g.status,
          g.is_favourite,
          g.created_at,
          COALESCE(SUM(gc.amount), 0) AS total_contributed
        FROM goals g
        LEFT JOIN goal_contributions gc
          ON gc.goal_id = g.id
        WHERE g.id = $1
          AND (
            (g.user_id = $2 AND g.household_id IS NULL)
            OR
            g.household_id IN (
              SELECT household_id FROM household_members WHERE user_id = $2
            )
          )
        GROUP BY g.id
        LIMIT 1
        `,
        [goalId, userId],
      );

      if (goalResult.rows.length === 0) {
        res.status(404).json({ error: "Goal not found" });
        return;
      }

      const row = goalResult.rows[0];
      const targetAmount = Number(row.target_amount);
      const totalContributed = Number(row.total_contributed ?? 0);
      const percentComplete =
        targetAmount > 0 ? (totalContributed / targetAmount) * 100 : 0;

      const goal = {
        id: row.id,
        name: row.name,
        targetAmount,
        currencyCode: row.currency_code,
        targetDate: row.target_date,
        status: row.status,
        isFavourite: row.is_favourite,
        totalContributed,
        percentComplete,
        createdAt: row.created_at,
      };

      // 2) Fetch individual contributions (if you have source_type, created_at)
      type ContributionRow = {
        id: string;
        amount: string;
        contributed_at: string;
        notes: string | null;
      };

      const contribResult = await pool.query<ContributionRow>(
        `
        SELECT
          id,
          amount,
          contributed_at,
          notes
        FROM goal_contributions
        WHERE goal_id = $1
        ORDER BY contributed_at DESC
        `,
        [goalId],
      );

      const contributions = contribResult.rows.map((c) => ({
        id: c.id,
        amount: Number(c.amount),
        createdAt: c.contributed_at,
        sourceType: c.notes,
      }));

      res.json({ goal, contributions });
    } catch (error) {
      console.error("Error fetching goal detail:", error);
      res.status(500).json({ error: "Failed to fetch goal detail" });
    }
  },
);

/**
 * PATCH /api/goals/:id
 * Update a goal's details
 */
router.patch(
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

      const goalId = req.params.id;
      const body = req.body;
      const {
        name,
        targetAmount,
        targetDate,
        status,
        currencyCode,
        categoryName,
      } = body;

      // Resolve categoryName -> categories.id if provided
      let categoryId: number | null = null;
      if (categoryName && categoryName.trim().length > 0) {
        const catResult = await pool.query<CategoryIdRow>(
          `SELECT id FROM categories WHERE name = $1 AND type = 'expense' LIMIT 1`,
          [categoryName],
        );
        if (catResult.rows.length > 0) {
          categoryId = catResult.rows[0].id;
        }
      }

      // Build dynamic update query
      const updates: string[] = [];
      const values: (string | number | null)[] = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
      }
      if (targetAmount !== undefined) {
        updates.push(`target_amount = $${paramIndex++}`);
        values.push(targetAmount);
      }
      if (targetDate !== undefined) {
        updates.push(`target_date = $${paramIndex++}`);
        values.push(targetDate);
      }
      if (status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(status);
      }
      if (currencyCode !== undefined) {
        updates.push(`currency_code = $${paramIndex++}`);
        values.push(currencyCode);
      }
      if (categoryId !== null) {
        updates.push(`category_id = $${paramIndex++}`);
        values.push(categoryId);
      }

      if (updates.length === 0) {
        res.json({ message: "No changes requested" });
        return;
      }

      values.push(goalId);
      values.push(userId);

      const query = `
        UPDATE goals
        SET ${updates.join(", ")}, updated_at = now()
        WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
        RETURNING id, name, target_amount, currency_code, target_date, status, created_at, is_favourite
      `;

      const result = await pool.query<GoalSummaryRow>(query, values);

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Goal not found or not authorized" });
        return;
      }

      const row = result.rows[0];
      const updatedGoal = {
        id: row.id,
        name: row.name,
        targetAmount: Number(row.target_amount),
        currencyCode: row.currency_code,
        targetDate: row.target_date,
        status: row.status,
        isFavourite: row.is_favourite,
      };

      res.json({ goal: updatedGoal });
    } catch (error) {
      console.error("Error updating goal:", error);
      res.status(500).json({ error: "Failed to update goal" });
    }
  },
);

/**
 * DELETE /api/goals/:id
 * Delete a goal
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

      const goalId = req.params.id;

      const result = await pool.query(
        `DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING id`,
        [goalId, userId],
      );

      if (result.rowCount === 0) {
        res.status(404).json({ error: "Goal not found or not authorized" });
        return;
      }

      res.json({ message: "Goal deleted successfully" });
    } catch (error) {
      console.error("Error deleting goal:", error);
      res.status(500).json({ error: "Failed to delete goal" });
    }
  },
);

/**
 * POST /api/goals/:id/contributions
 * Add a contribution to a goal
 */
router.post(
  "/:id/contributions",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = await resolveUserId(req);
      if (!userId) {
        res
          .status(401)
          .json({ error: "Unauthenticated or user not found in database" });
        return;
      }

      const goalId = req.params.id;
      const { amount, notes, date } = req.body;

      if (!amount || Number.isNaN(amount) || amount <= 0) {
        res.status(400).json({ error: "Invalid amount" });
        return;
      }

      // Verify goal ownership first
      const goalCheck = await pool.query(
        `SELECT id FROM goals WHERE id = $1 AND user_id = $2`,
        [goalId, userId],
      );

      if (goalCheck.rows.length === 0) {
        res.status(404).json({ error: "Goal not found or not authorized" });
        return;
      }

      const insertQuery = `
        INSERT INTO goal_contributions (goal_id, amount, notes, contributed_at)
        VALUES ($1, $2, $3, $4)
        RETURNING id, amount, notes, contributed_at
      `;

      const result = await pool.query(insertQuery, [
        goalId,
        amount,
        notes || null,
        date || new Date(),
      ]);

      const row = result.rows[0];
      const contribution = {
        id: row.id,
        amount: Number(row.amount),
        notes: row.notes,
        createdAt: row.contributed_at,
      };

      res.status(201).json({ contribution });
    } catch (error) {
      console.error("Error adding contribution:", error);
      res.status(500).json({ error: "Failed to add contribution" });
    }
  },
);

/**
 * DELETE /api/goals/:goalId/contributions/:contributionId
 * Delete a contribution
 */
router.delete(
  "/:goalId/contributions/:contributionId",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = await resolveUserId(req);
      if (!userId) {
        res
          .status(401)
          .json({ error: "Unauthenticated or user not found in database" });
        return;
      }

      const { goalId, contributionId } = req.params;

      // Verify goal ownership first
      const goalCheck = await pool.query(
        `SELECT id FROM goals WHERE id = $1 AND user_id = $2`,
        [goalId, userId],
      );

      if (goalCheck.rows.length === 0) {
        res.status(404).json({ error: "Goal not found or not authorized" });
        return;
      }

      const result = await pool.query(
        `DELETE FROM goal_contributions WHERE id = $1 AND goal_id = $2 RETURNING id`,
        [contributionId, goalId],
      );

      if (result.rowCount === 0) {
        res.status(404).json({ error: "Contribution not found" });
        return;
      }

      res.json({ message: "Contribution deleted successfully" });
    } catch (error) {
      console.error("Error deleting contribution:", error);
      res.status(500).json({ error: "Failed to delete contribution" });
    }
  },
);

export default router;
