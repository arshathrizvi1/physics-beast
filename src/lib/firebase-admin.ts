import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { db } from './firebase';
import {
  collection as fsCollection,
  doc as fsDoc,
  getDoc as fsGetDoc,
  getDocs as fsGetDocs,
  setDoc as fsSetDoc,
  updateDoc as fsUpdateDoc,
  deleteDoc as fsDeleteDoc,
} from 'firebase/firestore';

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
    console.warn('Firebase Admin credentials not set in environment. Using client Firestore fallback for passkey and database operations.');
  }
}

// Fallback client firestore adapter matching the admin firestore API used by routes
const clientDbFallback = {
  collection: (colPath: string) => {
    return {
      doc: (docPath?: string) => {
        const fullPath = docPath ? `${colPath}/${docPath}` : colPath;
        const parts = fullPath.split('/').filter(Boolean);
        const docRef = fsDoc(db, parts[0], ...parts.slice(1));
        return {
          id: docPath || docRef.id,
          ref: {
            delete: async () => fsDeleteDoc(docRef),
          },
          get: async () => {
            const snap = await fsGetDoc(docRef);
            return {
              exists: snap.exists(),
              data: () => snap.data(),
              ref: {
                delete: async () => fsDeleteDoc(docRef),
              },
            };
          },
          set: async (data: any, options?: any) => {
            await fsSetDoc(docRef, data, options || {});
          },
          update: async (data: any) => {
            await fsUpdateDoc(docRef, data);
          },
          delete: async () => {
            await fsDeleteDoc(docRef);
          },
        };
      },
      get: async () => {
        const parts = colPath.split('/').filter(Boolean);
        const colRef = fsCollection(db, parts[0], ...parts.slice(1));
        const snap = await fsGetDocs(colRef);
        return {
          docs: snap.docs.map((d) => ({
            id: d.id,
            ref: {
              delete: async () => fsDeleteDoc(d.ref),
            },
            data: () => d.data(),
          })),
        };
      },
    };
  },
};

export const adminAuth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(target, prop) {
    if (getApps().length) {
      return (getAuth() as any)[prop];
    }
    if (prop === 'createCustomToken') {
      return async (uid: string) => {
        throw new Error(
          'Firebase Admin Service Account credentials are required to generate custom authentication tokens. Please configure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
        );
      };
    }
    return (getAuth() as any)[prop];
  },
});

export const adminDb = new Proxy({} as ReturnType<typeof getFirestore>, {
  get(target, prop) {
    if (getApps().length) {
      return (getFirestore() as any)[prop];
    }
    if (prop in clientDbFallback) {
      return (clientDbFallback as any)[prop];
    }
    return (clientDbFallback as any)[prop];
  },
});
