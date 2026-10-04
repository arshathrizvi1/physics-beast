import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountStr) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccountStr))
      });
    } else {
      console.warn("FIREBASE_SERVICE_ACCOUNT_KEY is not set in environment variables.");
    }
  } catch (error: any) {
    console.error('Firebase admin initialization error', error.stack);
  }
}

export const adminAuth = admin.apps.length ? admin.auth() : null;
