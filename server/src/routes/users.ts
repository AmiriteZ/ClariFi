// server/src/routes/users.ts
import express, { Response } from "express";
import { pool } from "../db";
import {
  verifyFirebaseToken,
  AuthenticatedRequest,
} from "../middleware/verifyFirebaseToken";
import cloudinary from "../config/cloudinary";

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
  photo_url: string | null;
};

type ApiUser = {
  id: string;
  firebaseUid: string;
  email: string;
  firstName: string;
  lastName: string;
  dob: string;
  createdAt: string;
  photoUrl: string | null;
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
    photoUrl: row.photo_url || null,
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
        RETURNING id, firebase_uid, email, fname, lname, dob, created_at, photo_url;
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
  },
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
        `SELECT id, firebase_uid, email, fname, lname, dob, created_at, photo_url
         FROM users
         WHERE firebase_uid = $1`,
        [uid],
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "User profile not found" });
      }

      const user = mapUser(result.rows[0]);
      return res.json({ user });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      console.error("Error fetching user profile:", message);
      return res.status(500).json({ error: message });
    }
  },
);

/**
 * PATCH /api/users/me
 * Update user profile (name, photo)
 */
router.patch(
  "/me",
  verifyFirebaseToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
      }

      const { firstName, lastName, photoBase64 } = req.body;
      const { uid } = req.user;

      // 1. Get current user
      const userRes = await pool.query(
        "SELECT * FROM users WHERE firebase_uid = $1",
        [uid],
      );

      if (userRes.rows.length === 0) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      let photoUrl = userRes.rows[0].photo_url;
      const currentFirstName = userRes.rows[0].fname;
      const currentLastName = userRes.rows[0].lname;

      // 2. Upload to Cloudinary if photoBase64 is provided
      if (photoBase64) {
        try {
          const uploadRes = await cloudinary.uploader.upload(photoBase64, {
            folder: "clarifi_users",
            public_id: uid, // Use firebase UID to overwrite existing
            overwrite: true,
            transformation: [
              { width: 500, height: 500, crop: "fill", gravity: "face" },
            ],
          });
          photoUrl = uploadRes.secure_url;
        } catch (uploadError) {
          console.error("Cloudinary upload failed:", uploadError);
          res.status(500).json({ error: "Failed to upload profile picture" });
          return;
        }
      }

      // 3. Update Database
      const updateQuery = `
        UPDATE users
        SET fname = $1, lname = $2, photo_url = $3
        WHERE firebase_uid = $4
        RETURNING id, firebase_uid, email, fname, lname, dob, created_at, photo_url
      `;

      const updatedUserRes = await pool.query<DbUserRow>(updateQuery, [
        firstName || currentFirstName,
        lastName || currentLastName,
        photoUrl,
        uid,
      ]);

      const updatedUser = mapUser(updatedUserRes.rows[0]);
      res.json({ user: updatedUser });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  },
);

export default router;
