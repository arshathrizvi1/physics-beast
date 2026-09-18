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
    
    let secretToken = process.env.ZOOM_WEBHOOK_SECRET_TOKEN || "f7GsL3bNQS2T9x4U45Zltw";

    // Try to fetch from Firebase settings
    try {
      const settingsDoc = await adminDb.collection('settings').doc('zoom').get();
      if (settingsDoc.exists && settingsDoc.data()?.webhookToken) {
        secretToken = settingsDoc.data().webhookToken;
      }
    } catch (e) {
      console.warn("Failed to fetch zoom webhook token from Firebase");
    }

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
    const meetingId = body.payload?.object?.id?.toString();
    
    if (!meetingId) return NextResponse.json({ success: true, message: "No meeting ID found" });

    // Find if we have a scheduled class matching this Zoom link
    const classesSnapshot = await adminDb.collection('live_classes').where('platform', '==', 'zoom').get();
    let matchingClassDoc = null;
    
    classesSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.link && data.link.includes(meetingId)) {
        matchingClassDoc = doc;
      }
    });

    if (body.event === 'meeting.started') {
      if (matchingClassDoc) {
        // Automatically start the class
        await adminDb.collection('live_classes').doc(matchingClassDoc.id).update({
          status: 'live'
        });
        console.log(`Auto-started live class: ${matchingClassDoc.id}`);
      } else {
        // Fallback: Create draft if they never scheduled it
        const topic = body.payload.object.topic || "Zoom Live Class";
        const joinUrl = body.payload.object.join_url;
        const startTime = body.payload.object.start_time ? new Date(body.payload.object.start_time).getTime() : Date.now();
        const docRef = await adminDb.collection('live_classes').add({
          title: topic,
          description: 'Auto-detected Zoom Meeting',
          platform: 'zoom',
          link: joinUrl,
          scheduledFor: startTime,
          status: 'draft',
          courseId: null,
          batchId: null,
          targetFolderId: null,
          allowDirectJoin: true,
          createdAt: adminDb.FieldValue.serverTimestamp()
        });
        // Notify admin
        await adminDb.collection('notifications').add({
          title: "?? New Zoom Meeting Detected!",
          message: `Your Zoom meeting "${topic}" has started. Click here to assign it to a folder and go live for students!`,
          type: "admin_alert",
          target: "admin",
          link: `/admin/live?draftId=${docRef.id}`,
          timestamp: Date.now(),
          createdAt: Date.now(),
          readBy: []
        });
      }
    } else if (body.event === 'recording.completed') {
      const recordingFiles = body.payload?.object?.recording_files || [];
      const downloadToken = body.payload?.download_token;
      
      const mp4File = recordingFiles.find((f) => f.file_extension === 'MP4' || f.file_type === 'MP4');
      
      if (mp4File && mp4File.download_url) {
        const fetchUrl = downloadToken ? `${mp4File.download_url}?access_token=${downloadToken}` : mp4File.download_url;
        const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
        const apiKey = process.env.BUNNY_STREAM_API_KEY;
        
        try {
          const title = body.payload.object.topic || 'Zoom Cloud Recording';
          const videoDocId = adminDb.collection('videos').doc().id;
          const targetFolderId = matchingClassDoc ? (matchingClassDoc.data().targetFolderId || 'none') : 'none';
          const courseId = matchingClassDoc ? (matchingClassDoc.data().courseId || 'none') : 'none';
          
          await adminDb.collection('videos').doc(videoDocId).set({
              id: videoDocId,
              title: title,
              description: 'Auto-recorded Zoom class',
              platform: 'bunny',
              courseId: courseId === 'none' ? null : courseId,
              folderId: targetFolderId,
              type: 'video',
              isReady: false,
              processingStatus: 'downloading_on_aws',
              createdAt: adminDb.FieldValue.serverTimestamp(),
              updatedAt: Date.now()
          });

          if (matchingClassDoc) {
             await adminDb.collection('live_classes').doc(matchingClassDoc.id).update({
               bunnyVideoId: videoDocId,
               recordingStatus: 'downloading_on_aws'
             });
          }

          const serverHost = process.env.NEXT_PUBLIC_RTMP_SERVER_HOST || '13.60.252.104';
          const serverPort = process.env.RTMP_HTTP_PORT || '8000';
          const callbackSecret = process.env.RTMP_CALLBACK_SECRET || 'change-me-to-a-random-string';
          const websiteUrl = process.env.WEBSITE_URL || 'https://brilliantacademy.vercel.app';
          const webhookUrl = `${websiteUrl}/api/bunny/aws-webhook`;

          const res = await fetch(`http://${serverHost}:${serverPort}/api/generic-download`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ 
                 url: fetchUrl, 
                 password: "", 
                 title: title, 
                 metadata: { 
                     videoDocId: videoDocId,
                     videoTitle: title,
                     selectedFolderId: targetFolderId,
                     videoCourseId: courseId
                 }, 
                 webhookUrl, 
                 secret: callbackSecret 
             })
          });
          
          if (!res.ok) {
              console.error('AWS EC2 Failed to accept download request:', await res.text());
          } else {
              console.log('Successfully triggered AWS EC2 download for Zoom Recording: ', videoDocId);
          }
        } catch (e) {
          console.error('Error triggering AWS EC2 for Zoom Recording:', e);
        }
      }
    } else if (body.event === 'meeting.ended') {
      if (matchingClassDoc) {
        // Automatically end the class
        await adminDb.collection('live_classes').doc(matchingClassDoc.id).update({
          status: 'ended'
        });
        console.log(`Auto-ended live class: ${matchingClassDoc.id}`);
      }
    }

    return NextResponse.json({ success: true, message: "Webhook processed" });
  } catch (error: any) {
    console.error('Zoom Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
