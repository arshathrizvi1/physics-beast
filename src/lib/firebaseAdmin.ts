import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminAuth: Auth | null = null;

try {
  if (!getApps().length) {
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountStr) {
      const app: App = initializeApp({
        credential: cert(JSON.parse(serviceAccountStr))
      });
      adminAuth = getAuth(app);
    } else {
      console.warn("FIREBASE_SERVICE_ACCOUNT_KEY is not set in environment variables.");
    }
  } else {
    adminAuth = getAuth();
  }
} catch (error: any) {
  console.error('Firebase admin initialization error', error.stack);
}

export { adminAuth };
