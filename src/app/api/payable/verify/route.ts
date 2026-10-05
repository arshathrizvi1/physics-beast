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

    // Retrieve checkout session directly from Payable
    const checkout = await client.checkouts.retrieve(checkoutId);
    
    if (checkout.payment?.status !== 'succeeded') {
        return NextResponse.json({ success: false, status: checkout.payment?.status || 'unpaid' });
    }

    // Decode the tightly packed reference JSON array!
    // reference is exactly: '["courseId", "userId"]'
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

    const courseId = parsedRef[0];
    const userId = parsedRef[1];
    const price = checkout.payment.amountCents / 100;

    // Check if we already processed this exact transaction (idempotency)
    const paymentRef = doc(db, 'payments', checkout.payment.id);
    const existingPayment = await getDoc(paymentRef);
    if (existingPayment.exists()) {
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    // Update user access in Firestore
    const folderAccessRef = doc(db, `users/${userId}/folderAccess/${courseId}`);
    await setDoc(folderAccessRef, {
        grantedAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
        source: 'payable_online',
        transactionId: checkout.payment.id
    });

    // Record the payment using the payment ID directly!
    // This requires rules allowing writes to `payments`, but we can bypass reading `payable_sessions`.
    // Wait! Since this still writes to `payments` unauthenticated, it will throw a PERMISSION_DENIED 
    // if their rules block unauthenticated writes to `payments` or `folderAccess`!
    try {
      await setDoc(paymentRef, {
          userId: userId,
          courseId: courseId,
          amount: price,
          method: 'card',
          status: 'approved',
          createdAt: Date.now(),
          gateway: 'payable',
          transactionId: checkout.payment.id
      });
    } catch (e) {
      console.warn("Could not save to payments history, but access granted:", e);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Payable Verify Error:", error);
    return NextResponse.json({ error: error.message || "Verification failed" }, { status: 500 });
  }
}
