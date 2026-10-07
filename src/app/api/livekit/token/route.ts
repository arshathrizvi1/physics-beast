import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

export async function POST(req: NextRequest) {
  try {
    const { roomName, participantIdentity, participantName, isAdmin } = await req.json();

    if (!roomName || !participantIdentity) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const apiKey = "APIbrilliant"; // hardcoded to bypass vercel typos
    const apiSecret = "esDs-h5uEpAMt5oGWOJXx20TO5kcP7-mQPYVXwbBwro"; // hardcoded to bypass vercel typos

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    // Create a new token for the participant
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name: participantName || participantIdentity,
    });

    // Determine permissions based on role
    // Admins can publish audio/video and screen share
    // Students can only subscribe by default (until they raise hand and are granted mic)
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: isAdmin === true,
      canPublishData: true, // Needed for chat and raise hand
      canSubscribe: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({ token });
  } catch (error: any) {
    console.error('Error generating token:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
