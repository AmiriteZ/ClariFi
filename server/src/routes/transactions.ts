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
        [authUser.uid]
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
          c.name as category_name,
          a.name as account_name,
          i.name as institution_name
        FROM transactions t
        JOIN accounts a ON t.account_id = a.id
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN bank_connections bc ON a.bank_connection_id = bc.id
        LEFT JOIN institutions i ON bc.institution_id = i.id
        WHERE (a.bank_connection_id IN (SELECT id FROM bank_connections WHERE user_id = $1)
               OR a.household_id IN (SELECT household_id FROM household_members WHERE user_id = $1))
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
        WHERE (a.bank_connection_id IN (SELECT id FROM bank_connections WHERE user_id = $1)
               OR a.household_id IN (SELECT household_id FROM household_members WHERE user_id = $1))
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
  }
);

export default router;
