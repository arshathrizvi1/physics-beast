import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = 86400;

export async function GET() {
  const securityTxt = [
    'Contact: mailto:arshathrizvi1010@gmail.com',
    'Expires: 2027-12-31T23:59:59.000Z',
    'Preferred-Languages: en, ta, si',
    'Canonical: https://brillliantacademy.site/.well-known/security.txt',
    'Policy: https://brillliantacademy.site/privacy-policy',
  ].join('\n');

  return new NextResponse(securityTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
