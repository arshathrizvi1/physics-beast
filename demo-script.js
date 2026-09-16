const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, collection } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyCB84MWm3jF1PmRQyJxugarBfQT1Th4BwA',
  projectId: 'physics-beastsl'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const subjects = [
    { id: "8wzgeoKbus4srKxOyOrm", name: "Chemistry" },
    { id: "pvLUCUXCY3kok3GfWrkE", name: "Physics" }
  ];

  for (const subj of subjects) {
    const courseId = 'demo_monthly_' + subj.name.toLowerCase();
    
    // Create course
    await setDoc(doc(db, 'courses', courseId), {
      id: courseId,
      name: subj.name + ' Monthly Live Classes',
      description: 'Access all live classes, recordings, and PDF notes for ' + subj.name + '.',
      subjectId: subj.id,
      subjectName: subj.name,
      teacherId: 'demo_teacher',
      teacherName: 'Dr. Brilliant',
      isMonthly: true,
      price: 1500,
      createdAt: Date.now(),
      status: 'active'
    });

    console.log('Created course:', courseId);

    // Create some past monthly folders
    const months = [
      { offset: -2, price: 1500 }, // 2 months ago
      { offset: -1, price: 1500 }, // Last month
      { offset: 0, price: 1500 }   // Current month
    ];

    const now = new Date();
    
    for (const m of months) {
      const d = new Date(now.getFullYear(), now.getMonth() + m.offset, 1);
      const monthName = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      const folderId = \month_\_\_\\;
      
      await setDoc(doc(db, 'folders', folderId), {
        id: folderId,
        name: monthName,
        courseId: courseId,
        price: m.price,
        createdAt: d.getTime(),
        items: []
      });

      console.log('Created folder:', folderId);
    }
  }

  console.log('Demo data generation complete!');
  process.exit(0);
}

run().catch(console.error);
