import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!getApps().length) {
  if (projectId && clientEmail && privateKey) {
    try {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('Firebase Admin initialized successfully.');
    } catch (error) {
      console.error('Firebase admin initialization error', error);
    }
  } else {
    console.warn('Firebase Admin credentials missing. adminDb and adminAuth will not work. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in your .env.local file.');
  }
}

// Export getters or proxies that throw a clear error if uninitialized, 
// rather than an empty object that causes "is not a function" errors deep in the codebase.
export const adminAuth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(target, prop) {
    if (!getApps().length) {
      throw new Error('Firebase Admin Auth is not initialized. Check your environment variables (FIREBASE_PROJECT_ID, etc.).');
    }
    return (getAuth() as any)[prop];
  }
});

export const adminDb = new Proxy({} as ReturnType<typeof getFirestore>, {
  get(target, prop) {
    if (!getApps().length) {
      throw new Error('Firebase Admin Firestore is not initialized. Check your environment variables (FIREBASE_PROJECT_ID, etc.).');
    }
    return (getFirestore() as any)[prop];
  }
});
