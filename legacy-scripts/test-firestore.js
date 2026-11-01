import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCB84MWm3jF1PmRQyJxugarBfQT1Th4BwA',
  authDomain: 'physics-beastsl.firebaseapp.com',
  projectId: 'physics-beastsl',
  storageBucket: 'physics-beastsl.firebasestorage.app',
  messagingSenderId: '326758596614',
  appId: '1:326758596614:web:2cff6161b709b5f938c387'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  // Try writing a test payment doc (like a student would)
  try {
    const ref = await addDoc(collection(db, 'payments'), {
      studentId: 'test-student',
      studentName: 'Test Student',
      folderId: 'test-folder',
      folderName: 'Test Folder',
      amount: 100,
      method: 'bank',
      receiptUrl: '',
      status: 'pending',
      createdAt: Date.now()
    });
    console.log('Payment write SUCCESS:', ref.id);
  } catch (e) {
    console.log('Payment write FAILED:', e.message);
  }

  // Check how many payments exist
  try {
    const snap = await getDocs(collection(db, 'payments'));
    console.log('Total payments in DB:', snap.size);
    snap.docs.forEach(d => console.log(' -', d.id, JSON.stringify(d.data()).substring(0, 100)));
  } catch (e) {
    console.log('Read payments FAILED:', e.message);
  }
}
test();
