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
  query as fsQuery,
  where as fsWhere,
  limit as fsLimit,
  orderBy as fsOrderBy,
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

let projectId = process.env.FIREBASE_PROJECT_ID?.trim().replace(/^["']|["']$/g, '');
let clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim().replace(/^["']|["']$/g, '');
let privateKey = cleanPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

if ((!projectId || !clientEmail || !privateKey) && process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    let saJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
    if ((saJson.startsWith("'") && saJson.endsWith("'")) || (saJson.startsWith('"') && saJson.endsWith('"'))) {
      saJson = saJson.slice(1, -1);
    }
    const sa = JSON.parse(saJson);
    projectId = sa.project_id || projectId;
    clientEmail = sa.client_email || clientEmail;
    privateKey = cleanPrivateKey(sa.private_key) || privateKey;
  } catch (e) {
    console.warn("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY json");
  }
}

// Fallback: Check local service account JSON files in server environment
if ((!projectId || !clientEmail || !privateKey) && typeof window === 'undefined') {
  try {
    const fs = require('fs');
    const path = require('path');
    const candidatePaths = [
      path.join(process.cwd(), 'serviceAccountKey.json'),
      path.join(process.cwd(), 'firebase-admin-key.json'),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const sa = JSON.parse(fs.readFileSync(p, 'utf8'));
        projectId = sa.project_id;
        clientEmail = sa.client_email;
        privateKey = cleanPrivateKey(sa.private_key);
        break;
      }
    }
  } catch (e) {
    // ignore
  }
}

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
const createQueryHelper = (colRef: any, constraints: any[] = []): any => {
  return {
    where: (field: string, op: any, val: any) => {
      return createQueryHelper(colRef, [...constraints, fsWhere(field, op, val)]);
    },
    limit: (n: number) => {
      return createQueryHelper(colRef, [...constraints, fsLimit(n)]);
    },
    orderBy: (field: string, dir: any = 'asc') => {
      return createQueryHelper(colRef, [...constraints, fsOrderBy(field, dir)]);
    },
    get: async () => {
      const q = constraints.length > 0 ? fsQuery(colRef, ...constraints) : colRef;
      const snap = await fsGetDocs(q);
      return {
        empty: snap.empty,
        size: snap.size,
        docs: snap.docs.map((d) => ({
          id: d.id,
          ref: {
            delete: async () => fsDeleteDoc(d.ref),
            update: async (data: any) => fsUpdateDoc(d.ref, data),
          },
          data: () => d.data(),
        })),
      };
    },
  };
};

const clientDbFallback = {
  collection: (colPath: string) => {
    const parts = colPath.split('/').filter(Boolean);
    const colRef = fsCollection(db, parts[0], ...parts.slice(1));
    const helper = createQueryHelper(colRef, []);

    return {
      ...helper,
      doc: (docPath?: string) => {
        const fullPath = docPath ? `${colPath}/${docPath}` : colPath;
        const dParts = fullPath.split('/').filter(Boolean);
        const docRef = fsDoc(db, dParts[0], ...dParts.slice(1));
        return {
          id: docPath || docRef.id,
          ref: {
            delete: async () => fsDeleteDoc(docRef),
            update: async (data: any) => fsUpdateDoc(docRef, data),
          },
          get: async () => {
            const snap = await fsGetDoc(docRef);
            return {
              id: snap.id,
              exists: snap.exists(),
              data: () => snap.data(),
              ref: {
                delete: async () => fsDeleteDoc(docRef),
                update: async (data: any) => fsUpdateDoc(docRef, data),
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
      add: async (data: any) => {
        const newDocRef = fsDoc(colRef);
        await fsSetDoc(newDocRef, data);
        return { id: newDocRef.id };
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
