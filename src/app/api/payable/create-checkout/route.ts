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

    // Determine the base URL for success/cancel redirects
    const host = req.headers.get('host') || 'www.brillliantacademy.site';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    // We don't need a long reference since we save all data to Firestore mapped by checkout.id!
    const reference = `user_${userId.substring(0, 10)}_course_${courseId.substring(0, 10)}`;

    const checkout = await client.checkouts.create({
      amountCents: Math.round(price * 100), // Payable expects cents (e.g. Rs. 1000 = 100000)
      description: `Course: ${courseName}`,
      reference: reference,
      successUrl: `${baseUrl}/course/${courseId}?payment=success&session_id={CHECKOUT_ID}`,
      cancelUrl: `${baseUrl}/course/${courseId}?payment=cancelled`
    });

    // Save the checkout session mapping to Firestore so the user can be granted access when they return
    await setDoc(doc(db, 'payable_sessions', checkout.id), {
      checkoutId: checkout.id,
      courseId,
      courseName,
      price,
      userId,
      userEmail,
      studentId: studentId || null,
      userName: userName || null,
      status: 'pending',
      createdAt: Date.now()
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error: any) {
    console.error("Payable Checkout Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create checkout session" }, { status: 500 });
  }
}
