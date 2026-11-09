import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const isBrowser = typeof window !== "undefined";
const isLocalhost = isBrowser && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || (typeof atob === "function" ? atob("QUl6YVN5Q0I4NE1XbTNqRjFQbVJReUp4dWdhckJmUVQxVGg0QndB") : Buffer.from("QUl6YVN5Q0I4NE1XbTNqRjFQbVJReUp4dWdhckJmUVQxVGg0QndB", "base64").toString("utf-8")),
  authDomain: isLocalhost ? "physics-beastsl.firebaseapp.com" : "www.brillliantacademy.site",
  projectId: "physics-beastsl",
  storageBucket: "physics-beastsl.firebasestorage.app",
  messagingSenderId: "326758596614",
  appId: "1:326758596614:web:2cff6161b709b5f938c387",
  measurementId: "G-QLLWNDRH1P"
};

// Initialize Firebase only if it hasn't been initialized already (Next.js HMR safeguard)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Initialize Firestore safely with Ultra-Low Latency Caching
let dbInstance;
try {
  // Use modern persistent local cache so data loads instantly (0ms latency)
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
  });
} catch (e) {
  dbInstance = getFirestore(app);
}

export const db = dbInstance;
export const storage = getStorage(app, "gs://physics-beastsl.firebasestorage.app");
