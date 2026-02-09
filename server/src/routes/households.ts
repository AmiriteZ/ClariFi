import { Router, Response } from "express";
import {
  verifyFirebaseToken,
  type AuthenticatedRequest,
} from "../middleware/verifyFirebaseToken";
import { pool } from "../db";

const router = Router();

// -----------------------------------------------------------------------------
// 1. CREATE Household
// POST /api/households
// Body: { name: string }
// -----------------------------------------------------------------------------
router.post(
  "/",
  verifyFirebaseToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const firebaseUid = req.user?.uid;
      const { name } = req.body;

      if (!firebaseUid || !name) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Get user ID
        const userRes = await client.query(
          "SELECT id FROM users WHERE firebase_uid = $1",
          [firebaseUid],
        );
        if (userRes.rows.length === 0) {
          throw new Error("User not found");
        }
        const userId = userRes.rows[0].id;

        // Create Household (trigger will set invite_code)
        const hhRes = await client.query(
          `INSERT INTO households (name, type, created_by)
           VALUES ($1, 'family', $2)
           RETURNING id, name, invite_code, created_at`,
          [name, userId],
        );
        const household = hhRes.rows[0];

        // Add creator as Admin/Active member
        await client.query(
          `INSERT INTO household_members (household_id, user_id, role, status)
           VALUES ($1, $2, 'owner', 'active')`,
          [household.id, userId],
        );

        await client.query("COMMIT");
        return res.json(household);
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error("Error creating household:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

// -----------------------------------------------------------------------------
// 2. GET User's Households
// GET /api/households/me
// -----------------------------------------------------------------------------
router.get(
  "/me",
  verifyFirebaseToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const firebaseUid = req.user?.uid;
      if (!firebaseUid)
        return res.status(401).json({ error: "Not authenticated" });

      const userRes = await pool.query(
        "SELECT id FROM users WHERE firebase_uid = $1",
        [firebaseUid],
      );
      if (userRes.rows.length === 0)
        return res.status(404).json({ error: "User not found" });
      const userId = userRes.rows[0].id;

      const result = await pool.query(
        `SELECT
           h.id, h.name, h.invite_code, h.type,
           hm.role, hm.status, hm.joined_at,
           (SELECT COUNT(*) FROM household_members WHERE household_id = h.id AND status = 'active') as member_count
         FROM household_members hm
         JOIN households h ON hm.household_id = h.id
         WHERE hm.user_id = $1
         ORDER BY hm.joined_at DESC`,
        [userId],
      );

      return res.json(result.rows);
    } catch (err) {
      console.error("Error fetching households:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

// -----------------------------------------------------------------------------
// 3. JOIN Household (via code)
// POST /api/households/join
// Body: { code: string }
// -----------------------------------------------------------------------------
router.post(
  "/join",
  verifyFirebaseToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const firebaseUid = req.user?.uid;
      const { code } = req.body;

      if (!firebaseUid || !code)
        return res.status(400).json({ error: "Missing code" });

      const userRes = await pool.query(
        "SELECT id FROM users WHERE firebase_uid = $1",
        [firebaseUid],
      );
      if (userRes.rows.length === 0)
        return res.status(404).json({ error: "User not found" });
      const userId = userRes.rows[0].id;

      // Find household by code
      const hhRes = await pool.query(
        "SELECT id, name FROM households WHERE invite_code = $1",
        [code.toUpperCase()],
      );

      if (hhRes.rows.length === 0) {
        return res.status(404).json({ error: "Invalid invite code" });
      }
      const household = hhRes.rows[0];

      // Insert as 'pending_approval' (or 'active' if invite logic changes)
      // On conflict do nothing (or error if already joined?)
      // We'll catch unique constraint violation if they try to join same house twice
      try {
        await pool.query(
          `INSERT INTO household_members (household_id, user_id, role, status)
           VALUES ($1, $2, 'member', 'pending_approval')`,
          [household.id, userId],
        );
      } catch (dbErr: unknown) {
        if (
          dbErr &&
          typeof dbErr === "object" &&
          "code" in dbErr &&
          (dbErr as { code: string }).code === "23505"
        ) {
          return res.status(400).json({
            error: "You are already a member or have a pending request.",
          });
        }
        throw dbErr;
      }

      return res.json({
        message: "Join request sent",
        householdId: household.id,
        status: "pending_approval",
      });
    } catch (err) {
      console.error("Error joining household:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

// -----------------------------------------------------------------------------
// 4. GET Household Details (Members, etc.) - For switching view context
// GET /api/households/:id
// -----------------------------------------------------------------------------
router.get(
  "/:id",
  verifyFirebaseToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const firebaseUid = req.user?.uid;

      // Check membership
      const userRes = await pool.query(
        "SELECT id FROM users WHERE firebase_uid = $1",
        [firebaseUid],
      );
      const userId = userRes.rows[0].id;

      const memberCheck = await pool.query(
        "SELECT role, status FROM household_members WHERE household_id = $1 AND user_id = $2",
        [id, userId],
      );
      if (memberCheck.rows.length === 0) {
        return res
          .status(403)
          .json({ error: "Not a member of this household" });
      }

      // Fetch details + members
      const hhRes = await pool.query(
        "SELECT id, name, invite_code, type, created_at FROM households WHERE id = $1",
        [id],
      );
      const membersRes = await pool.query(
        `SELECT u.id, u.display_name, u.email, hm.role, hm.status, hm.joined_at
         FROM household_members hm
         JOIN users u ON hm.user_id = u.id
         WHERE hm.household_id = $1
         ORDER BY hm.status, hm.joined_at`,
        [id],
      );

      return res.json({
        ...hhRes.rows[0],
        members: membersRes.rows,
        currentUserRole: memberCheck.rows[0].role,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// -----------------------------------------------------------------------------
// 5. APPROVE / REJECT Member
// POST /api/households/:id/members/:targetUserId/:action
// action = 'approve' | 'reject'
// -----------------------------------------------------------------------------
router.post(
  "/:id/members/:targetUserId/:action",
  verifyFirebaseToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id, targetUserId, action } = req.params;
      const firebaseUid = req.user?.uid;

      if (!["approve", "reject", "kick"].includes(action)) {
        return res.status(400).json({ error: "Invalid action" });
      }

      // Check requester is owner/admin
      const userRes = await pool.query(
        "SELECT id FROM users WHERE firebase_uid = $1",
        [firebaseUid],
      );
      const userId = userRes.rows[0].id;

      const requester = await pool.query(
        "SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2",
        [id, userId],
      );
      if (requester.rows.length === 0 || requester.rows[0].role !== "owner") {
        return res
          .status(403)
          .json({ error: "Only owners can manage members" });
      }

      if (action === "approve") {
        await pool.query(
          "UPDATE household_members SET status = 'active' WHERE household_id = $1 AND user_id = $2",
          [id, targetUserId],
        );
      } else {
        // reject or kick -> delete row
        await pool.query(
          "DELETE FROM household_members WHERE household_id = $1 AND user_id = $2",
          [id, targetUserId],
        );
      }

      return res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// -----------------------------------------------------------------------------
// 6. HOUSEHOLD DASHBOARD (Aggregated view)
// GET /api/households/:id/dashboard
// -----------------------------------------------------------------------------
router.get(
  "/:id/dashboard",
  verifyFirebaseToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const firebaseUid = req.user?.uid;

      // 1. Verify membership
      const userRes = await pool.query(
        "SELECT id FROM users WHERE firebase_uid = $1",
        [firebaseUid],
      );
      const userId = userRes.rows[0].id;

      const memberCheck = await pool.query(
        "SELECT status FROM household_members WHERE household_id = $1 AND user_id = $2 AND status = 'active'",
        [id, userId],
      );
      if (memberCheck.rows.length === 0) {
        return res.status(403).json({ error: "Access denied" });
      }

      // 2. Get all active member IDs for aggregation
      // We aggregate data from all ACTIVE members
      const membersRes = await pool.query(
        "SELECT user_id FROM household_members WHERE household_id = $1 AND status = 'active'",
        [id],
      );
      const memberIds = membersRes.rows.map((m) => m.user_id);

      // SQL filter for ANY of these users' accounts
      // Note: we might need a more complex query if we want to separate by user, but for now we aggregate.
      const memberIdsSql = memberIds.map((uid) => `'${uid}'`).join(",");

      // PROD/DEV account ID handling (tool-account- prefix)
      // We need to match ANY of the member IDs
      const accountFilterSQL = `
        (
           a.external_account_id IN (${memberIdsSql}) 
           OR 
           a.external_account_id IN ( ${memberIds.map((uid) => `'tool-account-${uid}'`).join(",")} )
        )
      `;

      // --- A) Total Household Balance ---
      const balanceResult = await pool.query(
        `SELECT COALESCE(SUM(available_balance), 0) as total_balance 
         FROM accounts a 
         WHERE ${accountFilterSQL}`,
      );
      const totalBalance = Number(balanceResult.rows[0].total_balance);

      // --- B) Income / Expenses (Current Month) ---
      const flowResult = await pool.query(
        `SELECT 
           COALESCE(SUM(CASE WHEN t.direction = 'credit' THEN t.amount ELSE 0 END), 0) as income,
           COALESCE(SUM(CASE WHEN t.direction = 'debit' THEN t.amount ELSE 0 END), 0) as expenses
         FROM transactions t
         JOIN accounts a ON t.account_id = a.id
         WHERE ${accountFilterSQL}
           AND date_trunc('month', t.posted_at) = date_trunc('month', CURRENT_DATE)`,
      ); // Using CURRENT_DATE directly for simplicity
      const monthIncome = Number(flowResult.rows[0].income);
      const monthExpenses = Number(flowResult.rows[0].expenses);

      // --- C) Spending By Category (Household Wide) ---
      const categoryResult = await pool.query(
        `SELECT 
           COALESCE(c.name, 'Uncategorised') as category,
           COALESCE(SUM(t.amount), 0) as amount
         FROM transactions t
         JOIN accounts a ON t.account_id = a.id
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE ${accountFilterSQL}
           AND t.direction = 'debit'
           AND date_trunc('month', t.posted_at) = date_trunc('month', CURRENT_DATE)
         GROUP BY c.name
         ORDER BY amount DESC`,
      );
      const spendingByCategory = categoryResult.rows.map((r) => ({
        category: r.category,
        amount: Number(r.amount),
      }));

      // --- D) Recent Transactions (Hybrid View) ---
      // We want to show owner name if it's not the current user
      const recentResult = await pool.query(
        `SELECT 
           t.posted_at, t.merchant_name, t.amount, t.direction, c.name as category,
           a.external_account_id,
           u.display_name as owner_name,
           u.id as owner_id
         FROM transactions t
         JOIN accounts a ON a.id = t.account_id
         LEFT JOIN categories c ON c.id = t.category_id
         -- Join users to identify who owns the account
         -- (Assuming simple mapping where external_account_id contains user_id)
         LEFT JOIN users u ON (a.external_account_id = u.id::text OR a.external_account_id = 'tool-account-' || u.id::text)
         WHERE ${accountFilterSQL}
         ORDER BY t.posted_at DESC
         LIMIT 10`,
      );

      const recentTransactions = recentResult.rows.map((row, idx) => {
        const isMine = row.owner_id === userId;
        const signed =
          row.direction === "debit" ? -Number(row.amount) : Number(row.amount);

        return {
          id: idx,
          date: new Date(row.posted_at).toLocaleDateString("en-GB"),
          merchant: row.merchant_name,
          category: row.category ?? "Uncategorised",
          amount: signed,
          owner: isMine ? "You" : row.owner_name || "Member",
          isMine,
        };
      });

      // --- E) Household Goals (Shared) ---
      // Fetch ONE main goal for the household (e.g. earliest created active goal)
      const goalResult = await pool.query(
        `SELECT g.id, g.name, g.target_amount, COALESCE(SUM(gc.amount), 0) as current_amount
         FROM goals g
         LEFT JOIN goal_contributions gc ON gc.goal_id = g.id
         WHERE g.household_id = $1 AND g.status = 'active'
         GROUP BY g.id
         ORDER BY g.created_at ASC
         LIMIT 1`,
        [id],
      );

      let mainGoal = null;
      if (goalResult.rows.length > 0) {
        const g = goalResult.rows[0];
        mainGoal = {
          id: g.id,
          name: g.name,
          targetAmount: Number(g.target_amount),
          currentAmount: Number(g.current_amount),
        };
      } else {
        mainGoal = {
          id: null,
          name: "No household goals",
          targetAmount: 0,
          currentAmount: 0,
        };
      }

      // --- F) Insights ---
      const insights = [
        `Household balance: €${totalBalance.toFixed(2)}`,
        `Household income this month: €${monthIncome.toFixed(2)}`,
        `Household spending this month: €${monthExpenses.toFixed(2)}`,
      ];

      return res.json({
        summary: { totalBalance, monthIncome, monthExpenses },
        spendingByCategory,
        recentTransactions,
        mainGoal,
        insights,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

export default router;
