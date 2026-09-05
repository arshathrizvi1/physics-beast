
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
const app = initializeApp({
  apiKey: 'fake-api-key',
  authDomain: 'physics-beast.firebaseapp.com',
  projectId: 'physics-beast',
  storageBucket: 'physics-beast.appspot.com',
  messagingSenderId: '123',
  appId: '1:123:web:abc'
});
const db = getFirestore(app);
async function run() {
  const qs = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
  console.log('Students count:', qs.docs.length);
  qs.forEach(d => {
    console.log(d.id, d.data().name, 'isApproved:', d.data().isApproved);
  });
}
run();

