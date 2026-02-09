// server/src/routes/users.ts
import express, { Response } from "express";
import { pool } from "../db";
import {
  verifyFirebaseToken,
  AuthenticatedRequest,
} from "../middleware/verifyFirebaseToken";

const router = express.Router();

type RegisterBody = {
  firstName?: string;
  lastName?: string;
  dob?: string;
  email?: string;
};

type DbUserRow = {
  id: string | number;
  firebase_uid: string;
  email: string;
  fname: string;
  lname: string;
  dob: string;
  created_at: string;
};

type ApiUser = {
  id: string;
  firebaseUid: string;
  email: string;
  firstName: string;
  lastName: string;
  dob: string;
  createdAt: string;
};

function normalizeDob(raw: string | undefined): string | null {
  if (!raw) return null;
  const dob = raw.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    return dob;
  }

  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dob);
  if (!match) return null;

  const [, ddStr, mmStr, yyyyStr] = match;
  const dd = Number(ddStr);
  const mm = Number(mmStr);
  const yyyy = Number(yyyyStr);

  const isoDob = `${yyyy}-${mm.toString().padStart(2, "0")}-${dd
    .toString()
    .padStart(2, "0")}`;

  const date = new Date(isoDob);
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== yyyy ||
    date.getUTCMonth() + 1 !== mm ||
    date.getUTCDate() !== dd
  ) {
    return null;
  }

  return isoDob;
}

function mapUser(row: DbUserRow): ApiUser {
  return {
    id: String(row.id),
    firebaseUid: row.firebase_uid,
    email: row.email,
    firstName: row.fname,
    lastName: row.lname,
    dob: row.dob,
    createdAt: row.created_at,
  };
}

// POST /api/users/register (alias: /init-profile for backwards compatibility)
router.post(
  ["/register", "/init-profile"],
  verifyFirebaseToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { uid, email: firebaseEmail } = req.user;
      const { firstName, lastName, dob, email } = req.body as RegisterBody;

      const trimmedFirst = firstName?.trim();
      const trimmedLast = lastName?.trim();
      const normalizedDob = normalizeDob(dob);

      if (!trimmedFirst || !trimmedLast || !normalizedDob) {
        return res.status(400).json({
          error: "Missing or invalid fields. Expect firstName, lastName, dob.",
        });
      }

      const finalEmail = email?.trim() || firebaseEmail?.trim() || null;

      if (!finalEmail) {
        return res.status(400).json({
          error: "Email is required.",
        });
      }

      const query = `
        INSERT INTO users (firebase_uid, email, fname, lname, dob)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (firebase_uid) DO UPDATE
        SET email = EXCLUDED.email,
            fname = EXCLUDED.fname,
            lname = EXCLUDED.lname,
            dob   = EXCLUDED.dob
        RETURNING id, firebase_uid, email, fname, lname, dob, created_at;
      `;

      const result = await pool.query<DbUserRow>(query, [
        uid,
        finalEmail,
        trimmedFirst,
        trimmedLast,
        normalizedDob,
      ]);

      const user = mapUser(result.rows[0]);
      return res.json(user);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      console.error("Error creating user profile:", message);
      return res.status(500).json({ error: message });
    }
  }
);

// GET /api/users/me
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
