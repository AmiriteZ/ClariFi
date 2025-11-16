import { Request, Response, NextFunction } from "express";
import { admin } from "../lib/firebaseAdmin";

export interface AuthUser {
  uid: string;
  email: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export async function verifyFirebaseToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error(
        "verifyFirebaseToken: missing or invalid Authorization header:",
        authHeader
      );
      res
        .status(401)
        .json({ error: "Missing or invalid Authorization header" });
      return;
    }

    const token = authHeader.split(" ")[1];

    console.log(
      "verifyFirebaseToken: received token starting with:",
      token.slice(0, 20),
      "..."
    );

    const decoded = await admin.auth().verifyIdToken(token);

    req.user = {
      uid: decoded.uid,
      email: decoded.email ?? null,
    };

    next();
  } catch (err) {
    console.error("verifyFirebaseToken error:", err);
    res.status(401).json({ error: "Invalid token" });
  }
}