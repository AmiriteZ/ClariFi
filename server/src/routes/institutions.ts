import { Router } from "express";
import { pool } from "../db";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, country_code, provider_code FROM institutions ORDER BY name ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching institutions", err);
    res.status(500).json({ error: "Failed to load institutions" });
  }
});

export default router;
