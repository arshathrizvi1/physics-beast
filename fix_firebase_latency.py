import sys

path = r'C:\Projects\Brilliant Academy\physics-beast\src\lib\firebase.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

repl = """import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCB84MWm3jF1PmRQyJxugarBfQT1Th4BwA",
  authDomain: "physics-beastsl.firebaseapp.com",
  projectId: "physics-beastsl",
  storageBucket: "physics-beastsl.firebasestorage.app",
  messagingSenderId: "326758596614",
  appId: "1:326758596614:web:2cff6161b709b5f938c387",
  measurementId: "G-QLLWNDRH1P"
};

// Initialize Firebase only if it hasn't been initialized already (Next.js HMR safeguard)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Initialize Firestore safely to prevent Next.js hot-reload crashes
let dbInstance;
try {
  // REMOVED experimentalForceLongPolling (which was causing massive network latency)
  // ADDED local caching options
  dbInstance = initializeFirestore(app, {
    localCache: undefined // Use default cache if modern SDK, we'll try enableIndexedDbPersistence below
  });
} catch (e) {
  dbInstance = getFirestore(app);
}

export const db = dbInstance;

// ENABLE ULTRA LOW LATENCY CACHE
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn("Multiple tabs open, persistence can only be enabled in one tab at a a time.");
    } else if (err.code == 'unimplemented') {
      console.warn("The current browser does not support all of the features required to enable persistence");
    }
  });
}

export const storage = getStorage(app, "gs://physics-beastsl.firebasestorage.app");
"""

with open(path, 'w', encoding='utf-8') as f:
    f.write(repl)
print("Updated firebase.ts with ultra-low latency caching and disabled Long Polling!")
