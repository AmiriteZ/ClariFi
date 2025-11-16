// client/src/features/auth/api/auth.api.ts

import { auth } from "../../../lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import type { User } from "../../../store/auth.store";

export type LoginResponse = {
  token: string;
  user: User;
};

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ??
  "http://localhost:5001/api";

type BackendUser = {
  id: string;
  email: string;
  fname?: string | null;
  lname?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

type RawUserPayload = {
  user?: BackendUser;
} & Partial<BackendUser>;

function normaliseUser(raw: RawUserPayload): User {
  // Support both { user: {...} } and plain {... }
  const candidate: BackendUser = (raw.user ?? raw) as BackendUser;

  const id = String(candidate.id);
  const email = candidate.email;

  const first =
    candidate.fname ??
    candidate.firstName ??
    "";
  const last =
    candidate.lname ??
    candidate.lastName ??
    "";

  const name = `${first} ${last}`.trim() || email;

  return {
    id,
    name,
    email,
  };
}

// SIGN UP
export async function signupApi(
  firstName: string,
  lastName: string,
  dobIso: string, // "YYYY-MM-DD"
  email: string,
  password: string
): Promise<LoginResponse> {
  // 1) Create Firebase user (client SDK)
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const idToken = await cred.user.getIdToken();

  // 2) Register profile into Postgres
  const res = await fetch(`${API_BASE}/users/init-profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      firstName,
      lastName,
      dob: dobIso,
      email,
    }),
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "Failed to create user profile.");
  }

  const data = (await res.json()) as RawUserPayload;

  const user = normaliseUser(data);

  return { token: idToken, user };
}

// LOGIN
export async function loginApi(
  email: string,
  password: string
): Promise<LoginResponse> {
  // 1) Firebase login
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await cred.user.getIdToken();

  // 2) Fetch DB user profile
  const res = await fetch(`${API_BASE}/users/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "Failed to fetch user profile.");
  }

  const data = (await res.json()) as RawUserPayload;

  const user = normaliseUser(data);

  return { token: idToken, user };
}

// LOGOUT
export async function logoutApi(): Promise<void> {
  await signOut(auth);
}
