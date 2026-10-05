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

    // Return the validated data to the frontend so it can save the records using the authenticated user session!
    return NextResponse.json({ 
      success: true,
      courseId,
      userId,
      amount: price,
      paymentId: checkout.payment.id
    });
  } catch (error: any) {
    console.error("Payable Verify Error:", error);
    return NextResponse.json({ error: error.message || "Verification failed" }, { status: 500 });
  }
}
