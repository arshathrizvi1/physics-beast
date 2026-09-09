import { initializeApp, getApps, cert } from 'firebase-admin/app';
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

function cleanPrivateKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  let cleaned = key.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  // If provided as a base64 encoded string, decode it
  if (cleaned.startsWith('LS0t') || !cleaned.includes('-----BEGIN')) {
    try {
      const decoded = Buffer.from(cleaned, 'base64').toString('utf8');
      if (decoded.includes('-----BEGIN PRIVATE KEY-----')) {
        return decoded;
      }
    } catch (e) {
      // not base64
    }
  }
  return cleaned.replace(/\\n/g, '\n');
}

const projectId = process.env.FIREBASE_PROJECT_ID?.trim().replace(/^["']|["']$/g, '');
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim().replace(/^["']|["']$/g, '');
const privateKey = cleanPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

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

export const adminAuth = new Proxy({} as any, {
  get(target, prop) {
    if (typeof prop === 'symbol' || prop === 'then' || prop === 'toJSON') {
      return undefined;
    }
    if (getApps().length) {
      const { getAuth } = require('firebase-admin/auth');
      const auth = getAuth();
      const val = (auth as any)[prop];
      return typeof val === 'function' ? val.bind(auth) : val;
    }
    if (prop === 'createCustomToken') {
      return async (uid: string) => {
        throw new Error(
          'Firebase Admin Service Account credentials are required to generate custom authentication tokens. Please configure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
        );
      };
    }
    return undefined;
  },
});

export const adminDb = new Proxy({} as ReturnType<typeof getFirestore>, {
  get(target, prop) {
    if (typeof prop === 'symbol' || prop === 'then' || prop === 'toJSON') {
      return undefined;
    }
    if (getApps().length) {
      const fs = getFirestore();
      const val = (fs as any)[prop];
      return typeof val === 'function' ? val.bind(fs) : val;
    }
    if (prop in clientDbFallback) {
      const fallbackVal = (clientDbFallback as any)[prop];
      return typeof fallbackVal === 'function' ? fallbackVal.bind(clientDbFallback) : fallbackVal;
    }
    return (clientDbFallback as any)[prop];
  },
});
