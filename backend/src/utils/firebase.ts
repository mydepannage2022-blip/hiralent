import admin from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import * as serviceAccount from "../../config/firebase-adminsdk.json";

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

export const verifyFirebaseToken = async (token: string) => {
  return await getAuth().verifyIdToken(token);
};
