import { Router, Response } from "express";
import { pool } from "../db";
import {
  verifyFirebaseToken,
  AuthenticatedRequest,
} from "../middleware/verifyFirebaseToken";

const router = Router();

// All routes require auth
router.use(verifyFirebaseToken);

/**
 * GET /api/accounts
 * Fetch all linked bank accounts for the authenticated user
 */
router.get(
  "/",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const authUser = req.user;
      if (!authUser) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
      }

      // Resolve user ID from DB
      const userQuery = await pool.query(
        "SELECT id FROM users WHERE firebase_uid = $1",
        [authUser.uid]
      );

      if (userQuery.rows.length === 0) {
        res.status(401).json({ error: "User not found" });
        return;
      }

      const userId = userQuery.rows[0].id;

      const query = `
        SELECT
          a.id,
          a.name,
          a.account_type,
          a.currency_code,
          a.current_balance,
          a.masked_account_ref,
          i.name AS institution_name,
          a.last_synced_at
        FROM accounts a
        JOIN bank_connections bc ON a.bank_connection_id = bc.id
        JOIN institutions i ON bc.institution_id = i.id
        WHERE bc.user_id = $1
        ORDER BY i.name, a.name
      `;

      const result = await pool.query(query, [userId]);

      const accounts = result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        accountType: row.account_type,
        currencyCode: row.currency_code,
        currentBalance: parseFloat(row.current_balance),
        maskedRef: row.masked_account_ref,
        institutionName: row.institution_name,
        lastSyncedAt: row.last_synced_at,
      }));

      res.json({ accounts });
    } catch (error) {
      console.error("Error fetching accounts:", error);
      res.status(500).json({ error: "Failed to fetch accounts" });
    }
  }
);

export default router;
