const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyFakeKeyForLocalEmulatorOrJustIgnore", // we are not using emulator, wait, how to access firestore from node script?
};
// Actually I can't easily query firestore from node without admin sdk credentials.
