import { NextResponse } from 'next/server';

export async function GET() {
  return new NextResponse('loaderio-9c16305eee6db90b2415983ab899b6d5', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}
