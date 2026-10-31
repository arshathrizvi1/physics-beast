import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServerEnv } from '@/security/env';
import { sanitizeText } from '@/security/sanitize';
import { withZeroTrustGate, parseAndVerifyJsonBody } from '@/security/zero-trust-gate';

export const POST = withZeroTrustGate(
  {
    scope: 'verify_nic_gemini',
    limit: 10,
    windowMs: 60 * 1000,
  },
  async (req, ctx) => {
    const parsed = await parseAndVerifyJsonBody<{
      imageBase64?: string;
      name?: string;
      nicNumber?: string;
    }>(req, ctx);
    if (!parsed.ok) return parsed.response;

    const imageBase64 = String(parsed.body.imageBase64 || '');
    const name = sanitizeText(parsed.body.name, 100);
    const nicNumber = sanitizeText(parsed.body.nicNumber, 32);

    if (!imageBase64 || !name || !nicNumber) {
      return NextResponse.json(
        { success: false, message: 'Missing fields' },
        { status: 400 }
      );
    }

    // Cap imageBase64 size (~7MB max base64 string) to prevent memory exhaustion
    if (imageBase64.length > 7_500_000) {
      return NextResponse.json(
        { success: false, message: 'NIC image exceeds maximum size limit (5MB).' },
        { status: 413 }
      );
    }

    const env = getServerEnv();
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
You are an expert identity verification system for Sri Lankan NIC cards.
The user provided:
Name: "${name}"
NIC Number: "${nicNumber}"

Attached is an image of their ID card.

Rules for Verification:
1. Read the NIC number from the image and check if it exactly matches "${nicNumber}" (ignoring spaces/case).
2. Read the Name from the image and check if it is a reasonable match for "${name}". It doesn't have to be exact. Initials like "M.R.M. Arshad" matching "Mohammed Rispi Mohamed Arshad" are considered a MATCH. "Arshath" matching "Arshad" is a MATCH.
3. Check the birth year. Sri Lankan NIC numbers contain the birth year (either the first two digits for old NICs, e.g. "06xxxxxxxV" means 2006, or the first four digits for new NICs, e.g. "2006xxxxxx"). The birth year MUST be strictly greater than 2005 (e.g. 2006, 2007, 2008...).

If ALL three rules pass, respond with exactly: "APPROVED"
If any rule fails, respond with exactly: "REJECTED: [Reason]"
`;

    const base64Payload = imageBase64.includes(',')
      ? imageBase64.split(',')[1] || ''
      : imageBase64;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Payload, mimeType: 'image/jpeg' } },
    ]);

    const responseText = result.response.text().trim();
    if (responseText.startsWith('APPROVED')) {
      return NextResponse.json({ success: true, message: 'Identity Verified' });
    }
    return NextResponse.json({ success: false, message: responseText });
  }
);
