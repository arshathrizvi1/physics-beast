import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore } from "firebase/firestore";
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
  dbInstance = initializeFirestore(app, { experimentalForceLongPolling: true });
} catch (e) {
  dbInstance = getFirestore(app);
}
export const db = dbInstance;

export const storage = getStorage(app, "gs://physics-beastsl.firebasestorage.app");
