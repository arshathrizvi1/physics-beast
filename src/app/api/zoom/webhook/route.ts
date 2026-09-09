import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  return NextResponse.json({ status: "Zoom Webhook Endpoint Active", timestamp: Date.now() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const signature = request.headers.get('x-zm-signature');
    const timestamp = request.headers.get('x-zm-request-timestamp');
    
    // You'll set this inside Vercel Environment Variables later
    // ZOOM_WEBHOOK_SECRET_TOKEN=your_token_here
    const secretToken = process.env.ZOOM_WEBHOOK_SECRET_TOKEN || "f7GsL3bNQS2T9x4U45Zltw";

    // 1. Zoom Endpoint Verification (Mandatory for Zoom Setup)
    if (body.event === 'endpoint.url_validation') {
      const hashForValidate = crypto.createHmac('sha256', secretToken).update(body.payload.plainToken).digest('hex');
      return NextResponse.json({
        plainToken: body.payload.plainToken,
        encryptedToken: hashForValidate
      });
    }

    // 2. Validate Security Signature
    const message = `v0:${timestamp}:${JSON.stringify(body)}`;
    const hashForVerify = crypto.createHmac('sha256', secretToken).update(message).digest('hex');
    const signatureString = `v0=${hashForVerify}`;
    
    if (process.env.NODE_ENV === 'production' && signature !== signatureString && secretToken !== "test_token") {
      console.error('Invalid Zoom signature. Webhook rejected.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Process Zoom Events
    if (body.event === 'meeting.created' || body.event === 'meeting.started') {
      const meeting = body.payload.object;
      const meetingId = meeting.id.toString();
      const topic = meeting.topic || "Zoom Live Class";
      const joinUrl = meeting.join_url;
      const startTime = meeting.start_time ? new Date(meeting.start_time).getTime() : Date.now();

      // Check if we already drafted this meeting
      const existing = await adminDb.collection('live_classes').where('zoomMeetingId', '==', meetingId).get();
      
      if (existing.empty) {
        // Create an auto-draft live class
        const docRef = await adminDb.collection('live_classes').add({
          title: topic,
          description: 'Auto-detected Zoom Meeting',
          platform: 'zoom',
          link: joinUrl,
          zoomMeetingId: meetingId,
          scheduledFor: startTime,
          status: 'draft',
          courseId: null,
          batchId: null,
          targetFolderId: null,
          allowDirectJoin: true,
          createdAt: adminDb.FieldValue.serverTimestamp()
        });

        // Fire a Notification to Admins to configure it!
        await adminDb.collection('notifications').add({
          title: "🎥 New Zoom Meeting Detected!",
          message: `Your Zoom meeting "${topic}" has started. Click here to assign it to a folder and go live for students!`,
          type: "admin_alert",
          target: "admin",
          link: `/admin/live?draftId=${docRef.id}`,
          timestamp: Date.now(),
          createdAt: Date.now(),
          readBy: []
        });
        console.log("Successfully drafted Zoom meeting and notified admins:", topic);
      } else {
        console.log("Zoom meeting already exists in database:", topic);
      }
    }

    return NextResponse.json({ success: true, message: "Webhook processed" });
  } catch (error: any) {
    console.error('Zoom Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
