import fs from 'fs';

const filePath = 'C:/Projects/Brilliant Academy/physics-beast/src/app/admin/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const oldLogic = /const handleDeleteUserAccount = async \(userId: string, userName: string, role: string = "User"\) => \{[\s\S]*?console\.error\(err\);\s*\}\s*\};/m;

const newLogic = `
  const handleDeleteUserAccount = async (userId: string, userName: string, role: string = "User") => {
    if (confirmingDeleteId !== userId) {
      setConfirmingDeleteId(userId);
      alert(\`⚠️ DANGER: You are about to PERMANENTLY delete \${userName}'s account (\${role}) and ALL their history from the database. Click the delete button again to confirm.\`);
      return;
    }
    
    try {
      // 0. Delete user from Firebase Auth via server
      await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      // 1. Delete user from Firestore
      await deleteDoc(doc(db, 'users', userId));
      
      // 2. Delete all exam results for this user
      const qExams = query(collection(db, 'examResults'), where("userId", "==", userId));
      const examSnaps = await getDocs(qExams);
      const batch = writeBatch(db);
      examSnaps.forEach(docSnap => batch.delete(docSnap.ref));
      
      // 3. Delete payments for this user
      const qPayments = query(collection(db, 'payments'), where("studentId", "==", userId));
      const paymentSnaps = await getDocs(qPayments);
      paymentSnaps.forEach(docSnap => batch.delete(docSnap.ref));
      
      await batch.commit();

      alert(\`✅ Account for \${userName} (\${role}) has been permanently deleted from the database AND Authentication. They can now sign up from the beginning.\`);
      if (selectedStudentInfo?.id === userId) setSelectedStudentInfo(null);
      if (selectedTeacherDetails?.id === userId) setSelectedTeacherDetails(null);
      setConfirmingDeleteId(null);
    } catch (err) {
      alert("Failed to delete account. Please try again.");
      console.error(err);
    }
  };
`.trim();

content = content.replace(oldLogic, newLogic);
fs.writeFileSync(filePath, content);
