import { Request, Response, NextFunction } from "express";
import { admin } from "../lib/firebaseAdmin";

// ⬇⬇⬇ Make sure this is here AND exported
export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export async function verifyFirebaseToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.substring("Bearer ".length);

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.userId = decoded.uid;
    next();
  } catch (err) {
    console.error("Token verification failed:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
