import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'fake-api-key',
  authDomain: 'physics-beast.firebaseapp.com',
  projectId: 'physics-beast',
  storageBucket: 'physics-beast.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  const querySnapshot = await getDocs(collection(db, 'users'));
  const docs = querySnapshot.docs.map(d => ({ email: d.data().email, lastStudyDate: d.data().lastStudyDate, lastStudyPing: d.data().lastStudyPing, totalStudyTimeMins: d.data().totalStudyTimeMins }));
  console.log(JSON.stringify(docs, null, 2));
}

test();
