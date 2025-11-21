import { Router, Response } from "express";
import { pool } from "../db";
import {
  verifyFirebaseToken,
  AuthenticatedRequest,
} from "../middleware/verifyFirebaseToken";
import { YAPILY_CONFIG, yapilyAuthHeaders } from "../config/yapily";

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

/**
 * POST /api/accounts/connect
 * Start Open Banking connection flow with Yapily
 */
router.post(
  "/connect",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const authUser = req.user;
      if (!authUser) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
      }

      const { institutionId } = req.body;
      if (!institutionId) {
        res.status(400).json({ error: "institutionId is required" });
        return;
      }

      // Resolve user ID
      const userQuery = await pool.query(
        "SELECT id FROM users WHERE firebase_uid = $1",
        [authUser.uid]
      );
      if (userQuery.rows.length === 0) {
        res.status(401).json({ error: "User not found" });
        return;
      }
      const userId = userQuery.rows[0].id;

      // Get institution
      const instRes = await pool.query(
        "SELECT id, name, provider_code FROM institutions WHERE id = $1",
        [institutionId]
      );
      if (instRes.rowCount === 0) {
        res.status(400).json({ error: "Invalid institution" });
        return;
      }
      const institution = instRes.rows[0];

      // Create consent with Yapily
      const yapilyResponse = await fetch(
        `${YAPILY_CONFIG.baseUrl}/account-auth-requests`,
        {
          method: "POST",
          headers: yapilyAuthHeaders(),
          body: JSON.stringify({
            applicationUserId: String(userId),
            institutionId: institution.provider_code,
            callback: `${
              process.env.CLIENT_URL || "http://localhost:5173"
            }/accounts?connected=true`,
          }),
        }
      );

      if (!yapilyResponse.ok) {
        const errorText = await yapilyResponse.text();
        console.error("Yapily consent creation failed:", errorText);
        res.status(500).json({ error: "Failed to initiate bank connection" });
        return;
      }

      const yapilyData = await yapilyResponse.json();
      const consentId = yapilyData.data?.id || yapilyData.id;
      const consentUrl =
        yapilyData.data?.authorisationUrl || yapilyData.authorisationUrl;

      // Store bank connection
      const connRes = await pool.query(
        `INSERT INTO bank_connections (user_id, institution_id, provider, external_id, status)
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING id`,
        [userId, institution.id, "yapily", consentId]
      );

      res.json({
        connectionId: connRes.rows[0].id,
        consentUrl,
        institutionName: institution.name,
      });
    } catch (error) {
      console.error("Error starting bank connection:", error);
      res.status(500).json({ error: "Failed to start bank connection" });
    }
  }
);

/**
 * POST /api/accounts/sync/:connectionId
 * Sync accounts from Yapily into database
 */
router.post(
  "/sync/:connectionId",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const authUser = req.user;
      if (!authUser) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
      }

      const { connectionId } = req.params;
      const { consentToken } = req.body;

      if (!consentToken) {
        res.status(400).json({ error: "consentToken is required" });
        return;
      }

      // Resolve user ID
      const userQuery = await pool.query(
        "SELECT id FROM users WHERE firebase_uid = $1",
        [authUser.uid]
      );
      if (userQuery.rows.length === 0) {
        res.status(401).json({ error: "User not found" });
        return;
      }
      const userId = userQuery.rows[0].id;

      // Get connection
      const connRes = await pool.query(
        "SELECT id, external_id, user_id FROM bank_connections WHERE id = $1",
        [connectionId]
      );
      if (connRes.rowCount === 0) {
        res.status(404).json({ error: "Connection not found" });
        return;
      }
      const connection = connRes.rows[0];

      // Verify ownership
      if (connection.user_id !== userId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      // Fetch accounts from Yapily using the consent token
      console.log("🔄 Fetching accounts from Yapily using consent token");
      const yapilyResponse = await fetch(`${YAPILY_CONFIG.baseUrl}/accounts`, {
        method: "GET",
        headers: {
          ...yapilyAuthHeaders(),
          consent: consentToken,
        },
      });

      if (!yapilyResponse.ok) {
        const errorText = await yapilyResponse.text();
        console.error("❌ Yapily accounts fetch failed!");
        console.error(
          "Status:",
          yapilyResponse.status,
          yapilyResponse.statusText
        );
        console.error("Error response:", errorText);
        console.error("Request URL:", `${YAPILY_CONFIG.baseUrl}/accounts`);
        res
          .status(500)
          .json({ error: "Failed to fetch accounts from provider" });
        return;
      }

      const yapilyData = await yapilyResponse.json();
      const yapilyAccounts = yapilyData.data || [];

      // Insert or update each account
      for (const ya of yapilyAccounts) {
        await pool.query(
          `INSERT INTO accounts (
             bank_connection_id, household_id, external_account_id, name,
             account_type, currency_code, masked_account_ref,
             current_balance, available_balance, last_synced_at
           )
           VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, now())
           ON CONFLICT (bank_connection_id, external_account_id)
           DO UPDATE SET
             name = EXCLUDED.name,
             account_type = EXCLUDED.account_type,
             currency_code = EXCLUDED.currency_code,
             masked_account_ref = EXCLUDED.masked_account_ref,
             current_balance = EXCLUDED.current_balance,
             available_balance = EXCLUDED.available_balance,
             last_synced_at = now()`,
          [
            connection.id,
            ya.id,
            ya.nickname || ya.accountNames?.[0]?.name || "Account",
            ya.accountType || "current",
            ya.currency,
            ya.accountIdentifications?.[0]?.identification || null,
            ya.balance?.current?.amount || 0,
            ya.balance?.available?.amount || 0,
          ]
        );
      }

      res.json({ ok: true, accountCount: yapilyAccounts.length });
    } catch (error) {
      console.error("Error syncing accounts:", error);
      res.status(500).json({ error: "Failed to sync accounts" });
    }
  }
);

/**
 * POST /api/accounts/manual
 * Create a manual account (not connected to Open Banking)
 */
router.post(
  "/manual",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const authUser = req.user;
      if (!authUser) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
      }

      const { name, accountType, currencyCode, startingBalance, maskedRef } =
        req.body;

      // Validate required fields
      if (!name || !accountType || !currencyCode) {
        res
          .status(400)
          .json({ error: "name, accountType, and currencyCode are required" });
        return;
      }

      // Resolve user ID
      const userQuery = await pool.query(
        "SELECT id FROM users WHERE firebase_uid = $1",
        [authUser.uid]
      );
      if (userQuery.rows.length === 0) {
        res.status(401).json({ error: "User not found" });
        return;
      }
      const userId = userQuery.rows[0].id;

      // Create manual bank connection
      const connRes = await pool.query(
        `INSERT INTO bank_connections (user_id, institution_id, provider, external_id, status)
         VALUES ($1, NULL, 'manual', gen_random_uuid()::text, 'active')
         RETURNING id`,
        [userId]
      );
      const connectionId = connRes.rows[0].id;

      // Create account
      const balance = startingBalance || 0;
      const accountRes = await pool.query(
        `INSERT INTO accounts (
           bank_connection_id, household_id, external_account_id, name,
           account_type, currency_code, masked_account_ref,
           current_balance, available_balance, last_synced_at
         )
         VALUES ($1, NULL, gen_random_uuid()::text, $2, $3, $4, $5, $6, $7, now())
         RETURNING id`,
        [
          connectionId,
          name,
          accountType,
          currencyCode,
          maskedRef || null,
          balance,
          balance,
        ]
      );

      res.json({
        connection: { id: connectionId },
        account: {
          id: accountRes.rows[0].id,
          name,
          accountType,
          currencyCode,
          currentBalance: balance,
        },
      });
    } catch (error) {
      console.error("Error creating manual account:", error);
      res.status(500).json({ error: "Failed to create manual account" });
    }
  }
);

export default router;
