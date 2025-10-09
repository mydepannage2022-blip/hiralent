"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyFirebaseToken = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const auth_1 = require("firebase-admin/auth");
// Firebase config will be loaded from environment variables
// import * as serviceAccount from "../../config/firebase-adminsdk.json";
// For production, use environment variables for Firebase config
const firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};
firebase_admin_1.default.initializeApp({
    credential: firebase_admin_1.default.credential.cert(firebaseConfig),
});
const verifyFirebaseToken = async (token) => {
    return await (0, auth_1.getAuth)().verifyIdToken(token);
};
exports.verifyFirebaseToken = verifyFirebaseToken;
