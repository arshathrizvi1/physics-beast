"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.db = exports.auth = void 0;
var app_1 = require("firebase/app");
var auth_1 = require("firebase/auth");
var firestore_1 = require("firebase/firestore");
var storage_1 = require("firebase/storage");
var firebaseConfig = {
    apiKey: "AIzaSyCB84MWm3jF1PmRQyJxugarBfQT1Th4BwA",
    authDomain: "physics-beastsl.firebaseapp.com",
    projectId: "physics-beastsl",
    storageBucket: "physics-beastsl.firebasestorage.app",
    messagingSenderId: "326758596614",
    appId: "1:326758596614:web:2cff6161b709b5f938c387",
    measurementId: "G-QLLWNDRH1P"
};
// Initialize Firebase only if it hasn't been initialized already (Next.js HMR safeguard)
var app = !(0, app_1.getApps)().length ? (0, app_1.initializeApp)(firebaseConfig) : (0, app_1.getApp)();
exports.auth = (0, auth_1.getAuth)(app);
// Initialize Firestore safely to prevent Next.js hot-reload crashes
var dbInstance;
try {
    dbInstance = (0, firestore_1.initializeFirestore)(app, { experimentalForceLongPolling: true });
}
catch (e) {
    dbInstance = (0, firestore_1.getFirestore)(app);
}
exports.db = dbInstance;
exports.storage = (0, storage_1.getStorage)(app, "gs://physics-beastsl.firebasestorage.app");
