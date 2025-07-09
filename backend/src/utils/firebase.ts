import admin from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
// Firebase config will be loaded from environment variables
// import * as serviceAccount from "../../config/firebase-adminsdk.json";

// For production, use environment variables for Firebase config
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig as admin.ServiceAccount),
});

export const verifyFirebaseToken = async (token: string) => {
  return await getAuth().verifyIdToken(token);
};
