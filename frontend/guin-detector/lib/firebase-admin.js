import admin from "firebase-admin";

let app;

if (!admin.apps.length) {
  app = admin.initializeApp({
    credential: admin.credential.cert({
      clientEmail: process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.NEXT_PUBLIC_PRIVATE_KEY,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

const adminAuth = admin.auth(app);

export { adminAuth };