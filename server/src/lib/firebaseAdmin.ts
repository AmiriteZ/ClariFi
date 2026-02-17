import admin from "firebase-admin";

if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Production: Use JSON string from env var
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (error) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT", error);
    }
  } else {
    // Local / Default: Use GOOGLE_APPLICATION_CREDENTIALS file path
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }
}

export { admin };
