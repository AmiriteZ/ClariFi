// client/src/features/auth/api/auth.api.ts

import { auth } from "../../../lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

export type UserProfile = {
  id: number;
  firebaseUid: string;
  email: string;
  firstName: string;
  lastName: string;
  dob: string; // e.g. "2003-05-18" from Postgres
};

export type LoginResponse = {
  token: string;
  user: UserProfile;
};

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ?? "http://localhost:5001/api";

// Sign up: Firebase creates the auth user, backend stores profile in Postgres
export async function signupApi(
  firstName: string,
  lastName: string,
  dob: string, // dd/mm/yyyy from the form
  email: string,
  password: string
): Promise<LoginResponse> {
  // 1) Create Firebase Auth user
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const idToken = await cred.user.getIdToken();

  // 2) Tell our backend to create the Postgres row
  const res = await fetch(`${API_BASE}/users/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      firstName,
      lastName,
      dob, // backend will parse "dd/mm/yyyy" → DATE
      email,
    }),
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "Failed to create user profile.");
  }

  const user = (await res.json()) as UserProfile;

  return {
    token: idToken,
    user,
  };
}

// Login: Firebase signs in, backend returns the Postgres profile
export async function loginApi(
  email: string,
  password: string
): Promise<LoginResponse> {
  // 1) Sign in with Firebase Auth
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await cred.user.getIdToken();

  // 2) Fetch profile from backend (from Postgres via firebaseUid)
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

  const user = (await res.json()) as UserProfile;

  return {
    token: idToken,
    user,
  };
}

export async function logoutApi(): Promise<void> {
  await signOut(auth);
}
