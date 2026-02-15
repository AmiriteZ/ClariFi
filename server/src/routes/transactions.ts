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
 * GET /api/transactions
 * Fetch transactions with filtering and pagination
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

      // Resolve user ID
      const userQuery = await pool.query(
        "SELECT id FROM users WHERE firebase_uid = $1",
        [authUser.uid],
      );

      if (userQuery.rows.length === 0) {
        res.status(401).json({ error: "User not found" });
        return;
      }

      const userId = userQuery.rows[0].id;

      // Extract query params
      const page = parseInt((req.query.page as string) || "1");
      const limit = parseInt((req.query.limit as string) || "50");
      const offset = (page - 1) * limit;

      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const accountId = req.query.accountId as string;
      const categoryId = req.query.categoryId as string;
      const search = req.query.search as string;

      // Build query
      let queryText = `
        SELECT 
          t.id, 
          t.posted_at, 
          t.description, 
          t.merchant_name, 
          t.amount, 
          t.currency_code,
          t.direction,
          t.category_id, 
          t.status,
          t.is_hidden_from_household,
          c.name as category_name,
          a.name as account_name,
          i.name as institution_name
        FROM transactions t
        JOIN accounts a ON t.account_id = a.id
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN bank_connections bc ON a.bank_connection_id = bc.id
        LEFT JOIN institutions i ON bc.institution_id = i.id
        WHERE (
          -- Option 1: User owns the account (via bank connection) -> Show all
          a.bank_connection_id IN (SELECT id FROM bank_connections WHERE user_id = $1)
          OR 
          -- Option 2: User is in same household -> Show only if NOT hidden
          (
            a.household_id IN (SELECT household_id FROM household_members WHERE user_id = $1)
            AND t.is_hidden_from_household = false
          )
        )
      `;

      const queryParams: (string | number)[] = [userId];
      let paramCount = 1;

      if (startDate) {
        paramCount++;
        queryText += ` AND t.posted_at >= $${paramCount}`;
        queryParams.push(startDate);
      }

      if (endDate) {
        paramCount++;
        queryText += ` AND t.posted_at <= $${paramCount}`;
        queryParams.push(endDate);
      }

      if (accountId) {
        paramCount++;
        queryText += ` AND t.account_id = $${paramCount}`;
        queryParams.push(accountId);
      }

      if (categoryId) {
        if (categoryId === "uncategorized") {
          queryText += ` AND t.category_id IS NULL`;
        } else {
          paramCount++;
          queryText += ` AND t.category_id = $${paramCount}`;
          queryParams.push(categoryId);
        }
      }

      if (search) {
        paramCount++;
        queryText += ` AND (
          LOWER(t.description) LIKE LOWER($${paramCount}) OR 
          LOWER(t.merchant_name) LIKE LOWER($${paramCount})
        )`;
        queryParams.push(`%${search}%`);
      }

      // Add ordering and pagination
      queryText += ` ORDER BY t.posted_at DESC LIMIT $${
        paramCount + 1
      } OFFSET $${paramCount + 2}`;
      queryParams.push(limit, offset);

      // Execute query
      const result = await pool.query(queryText, queryParams);

      // Get total count for pagination (simplified, re-uses same where clause logic)
      // Note: For large datasets, this double count query can be optimized.
      // We'll reconstruct the WHERE clause for the count query.
      let countQueryText = `
        SELECT COUNT(*) 
        FROM transactions t
        JOIN accounts a ON t.account_id = a.id
        WHERE (
          a.bank_connection_id IN (SELECT id FROM bank_connections WHERE user_id = $1)
          OR 
          (
            a.household_id IN (SELECT household_id FROM household_members WHERE user_id = $1)
            AND t.is_hidden_from_household = false
          )
        )
      `;

      // Re-apply filters for count (slicing limit/offset params)
      const countParams = [...queryParams.slice(0, paramCount)];
      let countParamIdx = 1;

      if (startDate) {
        countParamIdx++;
        countQueryText += ` AND t.posted_at >= $${countParamIdx}`;
      }

      if (endDate) {
        countParamIdx++;
        countQueryText += ` AND t.posted_at <= $${countParamIdx}`;
      }

      if (accountId) {
        countParamIdx++;
        countQueryText += ` AND t.account_id = $${countParamIdx}`;
      }

      if (categoryId) {
        if (categoryId === "uncategorized") {
          countQueryText += ` AND t.category_id IS NULL`;
        } else {
          countParamIdx++;
          countQueryText += ` AND t.category_id = $${countParamIdx}`;
        }
      }

      if (search) {
        countParamIdx++;
        countQueryText += ` AND (
          LOWER(t.description) LIKE LOWER($${countParamIdx}) OR 
          LOWER(t.merchant_name) LIKE LOWER($${countParamIdx})
        )`;
      }

      const countResult = await pool.query(countQueryText, countParams);
      const totalFunctions = parseInt(countResult.rows[0].count);

      const transactions = result.rows.map((row) => ({
        id: row.id,
        date: row.posted_at,
        description: row.description,
        merchant: row.merchant_name || row.description,
        amount: parseFloat(row.amount),
        currencyCode: row.currency_code,
        direction: row.direction,
        categoryId: row.category_id,
        categoryName: row.category_name,
        accountName: row.account_name,
        institutionName: row.institution_name,
        status: row.status,
        isHiddenFromHousehold: row.is_hidden_from_household,
      }));

      res.json({
        transactions,
        pagination: {
          total: totalFunctions,
          page,
          limit,
          totalPages: Math.ceil(totalFunctions / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  },
);

/**
 * POST /api/transactions
 * Create a new manual transaction
 */
router.post(
  "/",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const authUser = req.user;
      if (!authUser) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
      }

      const {
        account_id,
        date,
        amount,
        description,
        direction,
        category_id,
        currency_code = "EUR", // Default to EUR if not provided
        merchant_name,
        is_hidden_from_household = false,
      } = req.body;

      // Basic validation
      if (!account_id || !date || !amount || !description || !direction) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      // Resolve user ID to ensure account ownership
      const userQuery = await pool.query(
        "SELECT id FROM users WHERE firebase_uid = $1",
        [authUser.uid],
      );

      if (userQuery.rows.length === 0) {
        res.status(401).json({ error: "User not found" });
        return;
      }

      const userId = userQuery.rows[0].id;

      // Verify account belongs to user (or their household)
      const accountCheck = await pool.query(
        `SELECT id FROM accounts 
         WHERE id = $1 AND (
           bank_connection_id IN (SELECT id FROM bank_connections WHERE user_id = $2)
           OR household_id IN (SELECT household_id FROM household_members WHERE user_id = $2)
         )`,
        [account_id, userId],
      );

      if (accountCheck.rows.length === 0) {
        res.status(403).json({ error: "Unauthorized access to this account" });
        return;
      }

      // Generate a manual external ID to satisfy unique constraint if present,
      // or just let it be NULL if schema allows.
      // Checking schema: external_tx_id is nullable.
      // However, we might want to differentiate manual transactions.
      // Let's leave external_tx_id null for manual transactions.

      const queryText = `
        INSERT INTO transactions (
          account_id,
          posted_at,
          description,
          amount,
          currency_code,
          direction,
          category_id,
          merchant_name,
          status,
          external_tx_id,
          is_hidden_from_household
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'posted', NULL, $9)
        RETURNING *
      `;

      const result = await pool.query(queryText, [
        account_id,
        date,
        description,
        amount,
        currency_code,
        direction,
        category_id || null, // Handle empty string/undefined as null
        merchant_name || description,
        is_hidden_from_household,
      ]);

      const row = result.rows[0];
      const newTransaction = {
        id: row.id,
        date: row.posted_at,
        description: row.description,
        merchant: row.merchant_name || row.description,
        amount: parseFloat(row.amount),
        currencyCode: row.currency_code,
        direction: row.direction,
        categoryId: row.category_id,
        categoryName: null, // Would need a join to get this, or just return basic info
        accountName: null, // Same here
        institutionName: null, // Same here
        status: row.status,
        isHiddenFromHousehold: row.is_hidden_from_household,
      };

      res.status(201).json(newTransaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(500).json({ error: "Failed to create transaction" });
    }
  },
);

/**
 * POST /api/transactions/bulk-privacy
 * Update privacy status for multiple transactions
 */
router.post(
  "/bulk-privacy",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const authUser = req.user;
      if (!authUser) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
      }

      const { transactionIds, isHidden } = req.body;

      if (
        !Array.isArray(transactionIds) ||
        transactionIds.length === 0 ||
        typeof isHidden !== "boolean"
      ) {
        res.status(400).json({ error: "Invalid request body" });
        return;
      }

      // 1. Resolve User ID
      const userRes = await pool.query(
        "SELECT id FROM users WHERE firebase_uid = $1",
        [authUser.uid],
      );
      if (userRes.rows.length === 0) {
        res.status(401).json({ error: "User not found" });
        return;
      }
      const userId = userRes.rows[0].id;

      // 2. Perform Update ONLY on transactions owned by user
      // We use a subquery to filter allowed IDs
      const updateResult = await pool.query(
        `
        UPDATE transactions
        SET is_hidden_from_household = $1
        WHERE id = ANY($2::uuid[])
          AND account_id IN (
            SELECT id FROM accounts 
            WHERE bank_connection_id IN (
              SELECT id FROM bank_connections WHERE user_id = $3
            )
          )
        RETURNING id
        `,
        [isHidden, transactionIds, userId],
      );

      res.json({
        message: "Transactions updated",
        updatedCount: updateResult.rowCount,
        updatedIds: updateResult.rows.map((r) => r.id),
      });
    } catch (error) {
      console.error("Error bulk updating transactions:", error);
      res.status(500).json({ error: "Failed to bulk update transactions" });
    }
  },
);

/**
 * PATCH /api/transactions/:id
 * Update a transaction (e.g. privacy status)
 */
router.patch(
  "/:id",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const authUser = req.user;
      if (!authUser) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
      }

      const transactionId = req.params.id;
      const { is_hidden_from_household } = req.body;

      if (is_hidden_from_household === undefined) {
        res.status(400).json({ error: "No fields to update provided" });
        return;
      }

      // 1. Verify user owns this transaction's account
      // We look up the transaction, join account, join bank_connection/household
      const ownershipCheck = await pool.query(
        `SELECT t.id 
         FROM transactions t
         JOIN accounts a ON t.account_id = a.id
         WHERE t.id = $1
           AND (
             a.bank_connection_id IN (SELECT id FROM bank_connections WHERE user_id = (SELECT id FROM users WHERE firebase_uid = $2))
             -- Add household check if we allow household admins to edit? For now, STRICT OWNERSHIP or maybe household admin?
             -- Let's stick to strict ownership for privacy features for now.
           )
        `,
        [transactionId, authUser.uid],
      );

      if (ownershipCheck.rows.length === 0) {
        res
          .status(403)
          .json({ error: "Transaction not found or unauthorized" });
        return;
      }

      // 2. Update
      const updateResult = await pool.query(
        `UPDATE transactions 
         SET is_hidden_from_household = $1
         WHERE id = $2
         RETURNING *`,
        [is_hidden_from_household, transactionId],
      );

      const row = updateResult.rows[0];
      const updatedTransaction = {
        id: row.id,
        date: row.posted_at,
        description: row.description,
        merchant: row.merchant_name || row.description,
        amount: parseFloat(row.amount),
        currencyCode: row.currency_code,
        direction: row.direction,
        categoryId: row.category_id,
        status: row.status,
        isHiddenFromHousehold: row.is_hidden_from_household,
      };

      res.json(updatedTransaction);
    } catch (error) {
      console.error("Error updating transaction:", error);
      res.status(500).json({ error: "Failed to update transaction" });
    }
  },
);

export default router;
