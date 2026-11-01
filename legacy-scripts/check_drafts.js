const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const serviceAccount = require("./src/lib/service-account.json");

if (!global.firebaseApp) {
  global.firebaseApp = initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

async function check() {
  const classes = await db.collection("live_classes").where("status", "==", "draft").orderBy("createdAt", "desc").limit(5).get();
  console.log("--- LATEST DRAFTS ---");
  classes.forEach(doc => console.log(doc.id, doc.data().title, doc.data().status));
}
check();
