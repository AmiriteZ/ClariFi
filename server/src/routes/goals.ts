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
  req: AuthenticatedRequest
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
    [firebaseUid]
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
        WHERE g.user_id = $1
          AND g.household_id IS NULL
        GROUP BY g.id
        ORDER BY g.created_at ASC
      `;

      const goalsResult = await pool.query<GoalSummaryRow>(goalsQuery, [
        userId,
      ]);

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
  }
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
          [categoryName]
        );

        if (catResult.rows.length > 0) {
          categoryId = catResult.rows[0].id;
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
        VALUES ($1, NULL, $2, $3, $4, $5, $6)
        RETURNING id, name, target_amount, currency_code, target_date, status, created_at
      `;

      const values = [
        userId, // ✅ user_id
        name.trim(),
        targetAmount,
        currencyCode.toUpperCase(),
        targetDate ?? null,
        categoryId,
      ];

      const insertResult = await pool.query<GoalSummaryRow>(
        insertQuery,
        values
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
  }
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
        [userId]
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
        [goalId, userId]
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
  }
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
          AND g.user_id = $2
          AND g.household_id IS NULL
        GROUP BY g.id
        LIMIT 1
        `,
        [goalId, userId]
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
        [goalId]
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
  }
);
export default router;
