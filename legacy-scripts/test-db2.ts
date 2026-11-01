
import { db } from './src/lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import * as dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
async function check() {
  const vids = await getDocs(query(collection(db, 'videos'), orderBy('createdAt', 'desc'), limit(5)));
  console.log('--- LATEST 5 VIDEOS ---');
  vids.forEach(d => {
    const v = d.data();
    console.log('Title: ' + v.title + ' | Status: ' + v.processingStatus + ' | Ready: ' + v.isReady + ' | Type: ' + v.type);
  });
  process.exit(0);
}
check();

