import { auth, db } from "../../../lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, setDoc, getDoc, type DocumentData } from "firebase/firestore";

export type LoginResponse = {
  token: string;
  user: { name: string; email: string };
};

// Sign up + create profile doc
export async function signupApi(
  name: string,
  email: string,
  password: string
): Promise<LoginResponse> {
  // TS will infer UserCredential here; no need to annotate
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const idToken = await cred.user.getIdToken();

  // Create a profile document (users/{uid})
  const ref = doc(db, "users", cred.user.uid);
  await setDoc(ref, {
    name,
    email,
    createdAt: new Date().toISOString(),
  });

  return { token: idToken, user: { name, email } };
}

// Login with email/password
export async function loginApi(
  email: string,
  password: string
): Promise<LoginResponse> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await cred.user.getIdToken();

  // Optional: read profile for display name
  const ref = doc(db, "users", cred.user.uid);
  const snap = await getDoc(ref);

  let displayName: string | undefined;

  if (snap.exists()) {
    // snap.data() is DocumentData (a typed map), avoid `as any`
    const data = snap.data() as DocumentData | undefined;
    const candidate = data?.name;
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      displayName = candidate;
    }
  }

  // Fallbacks: Firebase displayName, then email prefix
  if (!displayName) {
    displayName = cred.user.displayName ?? email.split("@")[0];
  }

  return { token: idToken, user: { name: displayName, email } };
}

export async function logoutApi() {
  await signOut(auth);
}
