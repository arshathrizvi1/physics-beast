import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { imageBase64, name, nicNumber } = await req.json();
    
    if (!imageBase64 || !name || !nicNumber) {
      return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
    }

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

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageBase64.split(',')[1], mimeType: 'image/jpeg' } }
    ]);
    
    const responseText = result.response.text().trim();
    if (responseText.startsWith('APPROVED')) {
      return NextResponse.json({ success: true, message: 'Identity Verified' });
    } else {
      return NextResponse.json({ success: false, message: responseText });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}