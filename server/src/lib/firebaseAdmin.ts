import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    // This will use GOOGLE_APPLICATION_CREDENTIALS env var
    credential: admin.credential.applicationDefault(),
  });
}

export { admin };