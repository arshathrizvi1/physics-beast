import { NextResponse } from 'next/server';
import { PaymentsLk } from '@payments-lk/node';
import { adminDb } from '@/lib/firebase-admin';

const PAYABLE_KEY = process.env.PAYABLE_SECRET_KEY || 'sk_test_3B0zeLlZeUHIwJxvkesJic2vyGGq70i7';
const client = new PaymentsLk(PAYABLE_KEY);

export async function POST(req: Request) {
  try {
    const { checkoutId } = await req.json();

    if (!checkoutId) {
      return NextResponse.json({ error: "Missing checkoutId" }, { status: 400 });
    }

    const checkout = await client.checkouts.retrieve(checkoutId);
    
    if (checkout.payment?.status !== 'succeeded') {
        return NextResponse.json({ success: false, status: checkout.payment?.status || 'unpaid' });
    }

    const refDataStr = checkout.payment.reference;
    if (!refDataStr) {
      return NextResponse.json({ error: "No reference data found on payment" }, { status: 400 });
    }

    let parsedRef: [string, string];
    try {
      parsedRef = JSON.parse(refDataStr);
    } catch {
      return NextResponse.json({ error: "Invalid reference data format" }, { status: 400 });
    }

    const folderId = parsedRef[0];
    const userId = parsedRef[1];
    const price = checkout.payment.amountCents / 100;

    // Retrieve user & course info from DB securely
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) throw new Error("User not found");
    const userData = userDoc.data() || {};
    
    const courseDoc = await adminDb.collection('folders').doc(folderId).get();
    const courseName = courseDoc.exists ? courseDoc.data()?.name : "Course";

    const now = Date.now();
    const folderAccess = userData.folderAccess || {};
    folderAccess[folderId] = now + (30 * 24 * 60 * 60 * 1000); // 30 days access

    // 1. Unlock course securely
    await adminDb.collection('users').doc(userId).update({ folderAccess });

    // 2. Add to payments collection for revenue tab
    // We check if this payment ID already exists to prevent duplicate entries if the user refreshes
    const existingPayment = await adminDb.collection('payments').where('transactionId', '==', checkout.payment.id).limit(1).get();
    
    if (existingPayment.empty) {
      await adminDb.collection('payments').add({
        studentId: userId,
        studentName: userData.name || "Student",
        studentEmail: userData.email || "",
        folderId: folderId,
        folderName: courseName,
        folderId: folderId,
        courseName: courseName,
        amount: price,
        method: 'card',
        status: 'approved',
        createdAt: now,
        gateway: 'payable',
        transactionId: checkout.payment.id
      });
    }

    return NextResponse.json({ 
      success: true,
      folderId,
      userId,
      amount: price,
      paymentId: checkout.payment.id
    });
  } catch (error: any) {
    console.error("Payable Verify Error:", error);
    return NextResponse.json({ error: error.message || "Verification failed" }, { status: 500 });
  }
}
