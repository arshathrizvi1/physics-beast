import { NextResponse } from 'next/server';
import { PaymentsLk } from '@payments-lk/node';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const PAYABLE_KEY = process.env.PAYABLE_SECRET_KEY || 'sk_test_3B0zeLlZeUHIwJxvkesJic2vyGGq70i7';
const client = new PaymentsLk(PAYABLE_KEY);

export async function POST(req: Request) {
  try {
    const { courseId, courseName, price, userId, userEmail, studentId, userName } = await req.json();

    if (!courseId || !userId || !price) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const host = req.headers.get('host') || 'www.brillliantacademy.site';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    // Pack the data tightly to fit within Payable's strict 64-char reference limit!
    // courseId (20 chars), userId (28 chars). Total JSON: ~55 chars.
    const reference = JSON.stringify([courseId, userId]);

    const checkout = await client.checkouts.create({
      amountCents: Math.round(price * 100),
      description: `Course: ${courseName}`,
      reference: reference,
      successUrl: `${baseUrl}/course/${courseId}?payment=success&session_id={CHECKOUT_ID}`,
      cancelUrl: `${baseUrl}/course/${courseId}?payment=cancelled`
    });

    // We don't save to Firestore here to avoid PERMISSION_DENIED errors for unauthenticated API routes.
    // Instead, we will parse the reference string directly from Payable during the verification step!
    return NextResponse.json({ url: checkout.url });
  } catch (error: any) {
    console.error("Payable Checkout Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create checkout session" }, { status: 500 });
  }
}
