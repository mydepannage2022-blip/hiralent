import admin from "firebase-admin";
import { getAuth, Auth } from "firebase-admin/auth";
// Firebase config is loaded from environment variables (FIREBASE_PROJECT_ID,
// FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY). Initialization is LAZY: the app
// is only initialized the first time a Firebase call is actually made. This means
// a missing/absent Firebase config never crashes the process at import/boot time
// — it only surfaces a clear error to the caller that needs Firebase.

let cachedAuth: Auth | null = null;

/**
 * Lazily initialize the Firebase Admin app and return its Auth instance.
 * Throws a clear error (instead of crashing boot) when the Firebase env vars
 * are not configured. Safe to call repeatedly — the app is initialized once.
 */
export const getFirebaseAuth = (): Auth => {
  if (cachedAuth) return cachedAuth;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase not configured: set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY."
    );
  }

  const app = admin.apps.length
    ? admin.app()
    : admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });

  cachedAuth = getAuth(app);
  return cachedAuth;
};

export const verifyFirebaseToken = async (token: string) => {
  return await getFirebaseAuth().verifyIdToken(token);
};
