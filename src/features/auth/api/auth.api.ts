// client/src/features/auth/api/auth.api.ts

import { auth, googleProvider } from "../../../lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import type { User } from "../../../store/auth.store";

export type LoginResponse = {
  token: string;
  user: User;
};

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") || "/api";

export type BackendUser = {
  id: string;
  email: string;
  fname?: string | null;
  lname?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  photo_url?: string | null;
  photoUrl?: string | null;
};

export type RawUserPayload = {
  user?: BackendUser;
} & Partial<BackendUser>;

export function normaliseUser(raw: RawUserPayload): User {
  // Support both { user: {...} } and plain {... }
  const candidate: BackendUser = (raw.user ?? raw) as BackendUser;

  const id = String(candidate.id);
  const email = candidate.email;

  const first = candidate.fname ?? candidate.firstName ?? "";
  const last = candidate.lname ?? candidate.lastName ?? "";

  const name = `${first} ${last}`.trim() || email;
  const photoUrl = candidate.photoUrl || candidate.photo_url || undefined;

  return {
    id,
    name,
    email,
    photoUrl,
  };
}

export async function fetchUserProfile(token: string): Promise<User> {
  const res = await fetch(`${API_BASE}/users/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "Failed to fetch user profile.");
  }

  const data = (await res.json()) as RawUserPayload;
  return normaliseUser(data);
}

// SIGN UP
export async function signupApi(
  firstName: string,
  lastName: string,
  dobIso: string, // "YYYY-MM-DD"
  email: string,
  password: string,
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
  password: string,
): Promise<LoginResponse> {
  // 1) Firebase login
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await cred.user.getIdToken();

  // 2) Fetch DB user profile
  const user = await fetchUserProfile(idToken);

  return { token: idToken, user };
}

// UPDATE USER
export async function updateUser(
  token: string,
  data: { firstName: string; lastName: string; photoBase64?: string },
): Promise<User> {
  const res = await fetch(`${API_BASE}/users/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "Failed to update profile.");
  }

  const responseData = (await res.json()) as { user: BackendUser };
  return normaliseUser(responseData.user);
}

// SOCIAL LOGIN
export async function loginWithGoogle(): Promise<LoginResponse> {
  const cred = await signInWithPopup(auth, googleProvider);
  const idToken = await cred.user.getIdToken();

  try {
    // 1. Try to fetch existing profile
    const user = await fetchUserProfile(idToken);
    return { token: idToken, user };
  } catch (error) {
    // 2. If fetch fails (likely 404), create a new profile
    console.log("User profile not found, creating new one...", error);

    const { displayName, email } = cred.user;
    const [firstName, ...lastNameParts] = (displayName || "User").split(" ");
    const lastName = lastNameParts.join(" ") || "User";

    // Call API to create profile with default DOB
    // We reuse the signup logic but hitting the endpoint directly to avoid re-auth issues if any
    const res = await fetch(`${API_BASE}/users/init-profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        firstName,
        lastName,
        email: email || "",
        dob: "2000-01-01", // Default DOB for social login
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
}

// LOGOUT
export async function logoutApi(): Promise<void> {
  await signOut(auth);
}
