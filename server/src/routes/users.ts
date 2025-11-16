// server/src/routes/users.ts
import express, { Response } from "express";
import { pool } from "../db";
import {
  verifyFirebaseToken,
  AuthenticatedRequest,
} from "../middleware/verifyFirebaseToken";

const router = express.Router();

interface InitProfileBody {
  fname: string;
  lname: string;
  dob: string; // "YYYY-MM-DD"
}

// POST /api/users/init-profile
router.post(
  "/init-profile",
  verifyFirebaseToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { uid, email } = req.user;
      const { fname, lname, dob } = req.body as InitProfileBody;

      if (!fname || !lname || !dob) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const query = `
        INSERT INTO users (firebase_uid, email, fname, lname, dob)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (firebase_uid) DO UPDATE
        SET fname = EXCLUDED.fname,
            lname = EXCLUDED.lname,
            dob   = EXCLUDED.dob
        RETURNING id, firebase_uid, email, fname, lname, dob, created_at;
      `;

      const values = [uid, email, fname, lname, dob];

      const result = await pool.query(query, values);
      const user = result.rows[0];

      return res.json({ user });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      console.error("Error creating user profile:", message);
      return res.status(500).json({ error: message });
    }
  }
);

// GET /api/users/me
router.get(
  "/me",
  verifyFirebaseToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { uid } = req.user;

      const result = await pool.query(
        `SELECT id, firebase_uid, email, fname, lname, dob, created_at
         FROM users
         WHERE firebase_uid = $1`,
        [uid]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "User profile not found" });
      }

      const user = result.rows[0];
      return res.json({ user });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      console.error("Error fetching user profile:", message);
      return res.status(500).json({ error: message });
    }
  }
);

export default router;