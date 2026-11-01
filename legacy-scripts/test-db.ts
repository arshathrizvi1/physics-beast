
import { adminDb } from './src/lib/firebase-admin';
import * as dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
async function check() {
  const vids = await adminDb.collection('videos').orderBy('createdAt', 'desc').limit(5).get();
  console.log('--- LATEST 5 VIDEOS ---');
  vids.docs.forEach(d => {
    const v = d.data();
    console.log('Title: ' + v.title + ' | Status: ' + v.processingStatus + ' | Ready: ' + v.isReady + ' | origYT: ' + v.originalYoutubeUrl);
  });
  process.exit(0);
}
check();

