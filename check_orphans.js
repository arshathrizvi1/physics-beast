const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function checkOrphans() {
  const listUsersResult = await auth.listUsers(1000);
  const authUsers = listUsersResult.users;
  
  let orphans = [];
  for (const userRecord of authUsers) {
    const doc = await db.collection('users').doc(userRecord.uid).get();
    if (!doc.exists) {
      orphans.push({ email: userRecord.email, uid: userRecord.uid });
    }
  }
  
  console.log("Found " + orphans.length + " orphaned emails in Auth:");
  orphans.forEach(o => console.log(o.email + " (" + o.uid + ")"));
}

checkOrphans().catch(console.error);
