import { Router, Response } from "express";
import { pool } from "../db";
import {
  verifyFirebaseToken,
  AuthenticatedRequest,
} from "../middleware/verifyFirebaseToken";

const router = Router();

router.use(verifyFirebaseToken);

/**
 * GET /api/categories
 * Fetch all categories ordered by parent/child relationship and display order
 */
router.get(
  "/",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Fetch categories
      // We want to return them in a way that's easy to display:
      // - Grouped by Parent (if we want optgroups)
      // - Or just a flat list with enough info to render nicely

      const query = `
        SELECT 
          c.id, 
          c.name, 
          c.type, 
          c.parent_id,
          p.name as parent_name
        FROM categories c
        LEFT JOIN categories p ON c.parent_id = p.id
        ORDER BY 
          c.type,                        -- Group by Income/Expense
          COALESCE(p.name, c.name),      -- Group by Parent Name
          c.parent_id NULLS FIRST,       -- Parents first
          c.display_order,               -- Explicit order
          c.name                         -- Alphabetical fallback
      `;

      const result = await pool.query(query);

      res.json({
        categories: result.rows,
      });
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  }
);

export default router;
