import { NextResponse } from 'next/server';
import { PaymentsLk } from '@payments-lk/node';
import { getServerEnv } from '@/security/env';
import { validatePayableCheckoutPayload } from '@/security/schemas';
import {
  resolveAuthoritativeCoursePrice,
  packSignedPayableReference,
} from '@/security/payment-authority';
import {
  withZeroTrustGate,
  parseAndVerifyJsonBody,
} from '@/security/zero-trust-gate';
import { blacklistActor, engageCryptographicTarpit } from '@/security/rate-limit';

export const POST = withZeroTrustGate(
  {
    scope: 'payable_create_checkout',
    limit: 20,
    windowMs: 60 * 1000,
  },
  async (req, ctx) => {
    const parsed = await parseAndVerifyJsonBody(req, ctx);
    if (!parsed.ok) return parsed.response;

    const validation = validatePayableCheckoutPayload(parsed.body);
    if (!validation.valid || !validation.data) {
      if (validation.honeypot) {
        blacklistActor({
          ip: ctx.ip,
          fingerprint: ctx.fingerprint,
          reason: validation.reason || 'CHECKOUT_TAMPERING',
        });
        await engageCryptographicTarpit(1500, 2600);
        return NextResponse.json(
          { error: 'ERR_REQ_REJECTED', code: 'ERR_REQ_REJECTED', traceId: ctx.traceId },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: validation.error || 'Missing required fields' },
        { status: 400 }
      );
    }

    const {
      courseId,
      folderId,
      courseName,
      clientSubmittedPrice,
      userId,
      userEmail,
      userPhone,
      userName,
    } = validation.data;

    // 1. Server-Side Price Authority: Resolve true folder/course price from Firestore
    const priceAuth = await resolveAuthoritativeCoursePrice({
      courseId,
      folderId,
      clientSubmittedPrice,
      ip: ctx.ip,
      fingerprint: ctx.fingerprint,
    });

    const authoritativeAmountCents = Math.round(priceAuth.authoritativePrice * 100);

    const host = req.headers.get('host') || 'www.brillliantacademy.site';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    // 2. Pack HMAC-SHA256 signed reference within Payable's 64-char limit
    const reference = packSignedPayableReference(
      folderId,
      userId,
      authoritativeAmountCents
    );

    const customerPayload: Record<string, string> = {
      name: userName || 'Student',
      email: userEmail || 'student@brillliantacademy.site',
    };
    if (userPhone) {
      customerPayload.phone = userPhone;
    }

    const env = getServerEnv();
    if (!env.PAYABLE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Payment gateway secret key is not configured on the server.' },
        { status: 503 }
      );
    }

    const client = new PaymentsLk(env.PAYABLE_SECRET_KEY);
    const checkout = await client.checkouts.create({
      amountCents: authoritativeAmountCents,
      description: `Course: ${courseName || priceAuth.courseName}`,
      reference,
      customer: customerPayload,
      successUrl: `${baseUrl}/course/${courseId}?payment=success`,
      cancelUrl: `${baseUrl}/course/${courseId}?payment=cancelled`,
    });

    return NextResponse.json({
      url: checkout.url,
      authoritativePrice: priceAuth.authoritativePrice,
      priceSource: priceAuth.source,
    });
  }
);
