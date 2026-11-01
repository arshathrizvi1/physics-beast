
const admin = require('firebase-admin');
require('dotenv').config({path: '.env.local'});

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  })
});

async function check() {
  const db = admin.firestore();
  const vids = await db.collection('videos').orderBy('createdAt', 'desc').limit(5).get();
  console.log('--- LATEST 5 VIDEOS ---');
  vids.forEach(d => {
    const v = d.data();
    console.log('Title: ' + v.title + ' | Status: ' + v.processingStatus + ' | Ready: ' + v.isReady + ' | origYT: ' + v.originalYoutubeUrl);
  });
  process.exit(0);
}
check();

