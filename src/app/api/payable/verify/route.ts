import { NextResponse } from 'next/server';
import { PaymentsLk } from '@payments-lk/node';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, setDoc, addDoc, collection } from 'firebase/firestore';

const PAYABLE_KEY = process.env.PAYABLE_SECRET_KEY || 'sk_test_3B0zeLlZeUHIwJxvkesJic2vyGGq70i7';
const client = new PaymentsLk(PAYABLE_KEY);

export async function POST(req: Request) {
  try {
    const { checkoutId } = await req.json();

    if (!checkoutId) {
      return NextResponse.json({ error: "Missing checkoutId" }, { status: 400 });
    }

    // Retrieve checkout session from Payable
    const checkout = await client.checkouts.retrieve(checkoutId);
    
    // We expect the payment object inside
    if (checkout.payment?.status !== 'succeeded') {
        return NextResponse.json({ success: false, status: checkout.payment?.status || 'unpaid' });
    }

    // Retrieve our stored session from Firestore
    const sessionDocRef = doc(db, 'payable_sessions', checkoutId);
    const sessionSnap = await getDoc(sessionDocRef);

    if (!sessionSnap.exists()) {
      return NextResponse.json({ error: "Session not found in database" }, { status: 404 });
    }

    const sessionData = sessionSnap.data();

    // If already processed, return success early
    if (sessionData.status === 'completed') {
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    // Update user access in Firestore
    const folderAccessRef = doc(db, `users/${sessionData.userId}/folderAccess/${sessionData.courseId}`);
    await setDoc(folderAccessRef, {
        grantedAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
        source: 'payable_online',
        transactionId: checkout.payment.id
    });

    // Mark session as completed
    await updateDoc(sessionDocRef, {
        status: 'completed',
        paymentId: checkout.payment.id,
        completedAt: Date.now()
    });

    // Add to payments collection for admin finance dashboard
    await addDoc(collection(db, 'payments'), {
        userId: sessionData.userId,
        userEmail: sessionData.userEmail,
        studentId: sessionData.studentId,
        studentName: sessionData.userName,
        courseId: sessionData.courseId,
        courseName: sessionData.courseName,
        teacherId: null, // Depending on if we have it
        amount: sessionData.price,
        method: 'card',
        receiptUrl: null,
        status: 'approved',
        createdAt: Date.now(),
        gateway: 'payable',
        transactionId: checkout.payment.id
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Payable Verify Error:", error);
    return NextResponse.json({ error: error.message || "Verification failed" }, { status: 500 });
  }
}
