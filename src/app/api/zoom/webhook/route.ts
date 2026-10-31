// @ts-nocheck
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { getServerEnv } from '@/security/env';
import { timingSafeEqualStr } from '@/security/session';

export async function GET() {
  return NextResponse.json({ status: 'Zoom Webhook Endpoint Active', timestamp: Date.now() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const signature = request.headers.get('x-zm-signature') || '';
    const timestamp = request.headers.get('x-zm-request-timestamp') || '';

    const env = getServerEnv();
    let secretToken = env.ZOOM_WEBHOOK_SECRET_TOKEN;

    try {
      const settingsDoc = await adminDb.collection('settings').doc('zoom').get();
      if (settingsDoc.exists && settingsDoc.data()?.webhookToken) {
        secretToken = settingsDoc.data().webhookToken;
      }
    } catch {
      // Fallback to env variable
    }

    if (!secretToken) {
      return NextResponse.json({ error: 'Zoom webhook secret not configured' }, { status: 503 });
    }

    // 1. Zoom Endpoint Verification (Mandatory for Zoom Setup)
    if (body.event === 'endpoint.url_validation') {
      const hashForValidate = crypto
        .createHmac('sha256', secretToken)
        .update(String(body.payload?.plainToken || ''))
        .digest('hex');
      return NextResponse.json({
        plainToken: body.payload?.plainToken,
        encryptedToken: hashForValidate,
      });
    }

    // 2. Validate Security Signature
    const message = `v0:${timestamp}:${JSON.stringify(body)}`;
    const hashForVerify = crypto.createHmac('sha256', secretToken).update(message).digest('hex');
    const signatureString = `v0=${hashForVerify}`;

    if (env.NODE_ENV === 'production' && !timingSafeEqualStr(signature, signatureString)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Process Zoom Events
    const meetingId = body.payload?.object?.id?.toString();
    if (!meetingId) return NextResponse.json({ success: true, message: 'No meeting ID found' });

    const classesSnapshot = await adminDb
      .collection('live_classes')
      .where('platform', '==', 'zoom')
      .get();
    let matchingClassDoc = null;

    classesSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.link && data.link.includes(meetingId)) {
        if (!matchingClassDoc) {
          matchingClassDoc = doc;
        } else if (data.status === 'live') {
          matchingClassDoc = doc;
        } else if (data.status === 'scheduled' && matchingClassDoc.data().status !== 'live') {
          matchingClassDoc = doc;
        }
      }
    });

    if (body.event === 'meeting.started' || body.event === 'meeting.created') {
      if (matchingClassDoc) {
        await adminDb.collection('live_classes').doc(matchingClassDoc.id).update({
          status: 'live',
        });
      } else {
        const topic = body.payload.object.topic || 'Zoom Live Class';
        const joinUrl = body.payload.object.join_url;
        const startTime = body.payload.object.start_time
          ? new Date(body.payload.object.start_time).getTime()
          : Date.now();
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
          createdAt: Date.now(),
        });
        await adminDb.collection('notifications').add({
          title: '🎥 New Zoom Meeting Detected!',
          message: `Your Zoom meeting "${topic}" has started. Click here to assign it to a folder and go live for students!`,
          type: 'admin_alert',
          target: 'admin',
          link: `/admin/live?draftId=${docRef.id}`,
          timestamp: Date.now(),
          createdAt: Date.now(),
          readBy: [],
        });
      }
    } else if (body.event === 'recording.completed') {
      const recordingFiles = body.payload?.object?.recording_files || [];
      const downloadToken = body.payload?.download_token;

      const mp4File = recordingFiles.find(
        (f) => f.file_extension === 'MP4' || f.file_type === 'MP4'
      );

      if (mp4File && mp4File.download_url) {
        const fetchUrl = downloadToken
          ? `${mp4File.download_url}?access_token=${downloadToken}`
          : mp4File.download_url;
        const passcode =
          body.payload?.object?.recording_play_passcode || body.payload?.object?.password || '';

        try {
          const title = body.payload.object.topic || 'Zoom Cloud Recording';
          const videoDocId = adminDb.collection('videos').doc().id;
          const targetFolderId = matchingClassDoc
            ? matchingClassDoc.data().targetFolderId || 'none'
            : 'none';
          const courseId = matchingClassDoc ? matchingClassDoc.data().courseId || 'none' : 'none';

          await adminDb.collection('videos').doc(videoDocId).set({
            id: videoDocId,
            title,
            description: 'Auto-recorded Zoom class',
            platform: 'r2',
            courseId: courseId === 'none' ? null : courseId,
            folderId: targetFolderId,
            type: 'video',
            isReady: false,
            processingStatus: 'processing',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          if (matchingClassDoc) {
            await adminDb.collection('live_classes').doc(matchingClassDoc.id).update({
              bunnyVideoId: videoDocId,
              recordingStatus: 'processing',
            });
          }

          const pipeline = (process.env.DOWNLOAD_PIPELINE || 'github').toLowerCase();

          if (pipeline === 'aws') {
            const serverHost = process.env.NEXT_PUBLIC_RTMP_SERVER_HOST || '13.60.252.104';
            const serverPort = process.env.RTMP_HTTP_PORT || '8000';
            const callbackSecret = env.RTMP_CALLBACK_SECRET;
            const websiteUrl = process.env.WEBSITE_URL || 'https://brillliantacademy.site';
            const webhookUrl = `${websiteUrl}/api/bunny/aws-webhook`;

            await fetch(`http://${serverHost}:${serverPort}/api/generic-download`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: fetchUrl,
                password: passcode,
                title,
                metadata: {
                  videoDocId,
                  videoTitle: title,
                  selectedFolderId: targetFolderId,
                  videoCourseId: courseId,
                },
                webhookUrl,
                secret: callbackSecret,
              }),
            });
          } else {
            const githubToken = process.env.GITHUB_ACTIONS_TOKEN;
            const githubOwner = process.env.GITHUB_REPO_OWNER || 'arshathrizvi1';
            const githubRepo = process.env.GITHUB_REPO_NAME || 'physics-beast';

            if (githubToken) {
              const dispatchUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/dispatches`;
              await fetch(dispatchUrl, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${githubToken}`,
                  Accept: 'application/vnd.github+json',
                  'X-GitHub-Api-Version': '2022-11-28',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  event_type: 'youtube-download',
                  client_payload: {
                    url: fetchUrl,
                    password: passcode,
                    title,
                    metadata: {
                      videoDocId,
                      videoTitle: title,
                      selectedFolderId: targetFolderId,
                      videoCourseId: courseId,
                    },
                  },
                }),
              });
            }
          }
        } catch (e) {
          console.error('Error triggering pipeline for Zoom Recording:', e);
        }
      }
    } else if (body.event === 'meeting.ended') {
      if (matchingClassDoc) {
        await adminDb.collection('live_classes').doc(matchingClassDoc.id).update({
          status: 'ended',
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Webhook processed' });
  } catch (error: any) {
    console.error('Zoom Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
