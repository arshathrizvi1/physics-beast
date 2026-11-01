const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyCB84MWm3jF1PmRQyJxugarBfQT1Th4BwA",
  authDomain: "physics-beastsl.firebaseapp.com",
  projectId: "physics-beastsl",
  storageBucket: "physics-beastsl.firebasestorage.app",
  messagingSenderId: "326758596614",
  appId: "1:326758596614:web:2cff6161b709b5f938c387"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const snap = await getDocs(collection(db, "courses"));
  snap.forEach(doc => {
    if (doc.data().batchId === 'all') {
      console.log('Global Course:', doc.id, doc.data().name, 'Subject:', doc.data().subjectId);
    }
  });
  
  const subj = await getDocs(collection(db, "subjects"));
  console.log("\nSubjects:");
  subj.forEach(d => console.log(d.id, d.data().name));
  
  process.exit(0);
}
run();
