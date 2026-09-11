import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, password, title, metadata } = body;

    if (!url) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    const serverHost = process.env.NEXT_PUBLIC_RTMP_SERVER_HOST || '13.60.252.104';
    const serverPort = process.env.RTMP_HTTP_PORT || '8000';
    const callbackSecret = process.env.RTMP_CALLBACK_SECRET || 'change-me-to-a-random-string';
    const websiteUrl = process.env.WEBSITE_URL || 'https://brilliantacademy.vercel.app';

    const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');

    const awsUrl = 'http://' + serverHost + ':' + serverPort + '/api/generic-download';
    const webhookUrl = websiteUrl + '/api/bunny/aws-webhook';

    const res = await fetch(awsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        password,
        title,
        metadata,
        webhookUrl,
        secret: callbackSecret
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: 'EC2 server error: ' + errText }, { status: res.status });
    }

    const data = await res.json();

    await adminDb.collection('notifications').add({
      title: isYoutube ? '🎬 YouTube Download Started' : '📹 Recording Download Started',
      message: isYoutube
        ? `The AWS server is now downloading "${title}" from YouTube using bot-bypass (WARP proxy). This may take a few minutes.`
        : `The AWS server is now downloading "${title}". You will be notified once it finishes.`,
      type: 'info',
      link: '/admin/library',
      createdAt: Date.now(),
      isGlobal: true,
      readBy: [],
      clearedBy: []
    });

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[Generic Download] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


    if (isYoutube && apifyToken) {
      // 1. Call Apify
      const apifyWebhookConfig = [
        {
          eventTypes: ["ACTOR.RUN.SUCCEEDED"],
          requestUrl: websiteUrl + '/api/apify/webhook',
          payloadTemplate: JSON.stringify({
            datasetId: "{{resource.defaultDatasetId}}",
            metadata: metadata,
            title: title,
          })
        }
      ];
      const base64Webhooks = Buffer.from(JSON.stringify(apifyWebhookConfig)).toString('base64');
      const apifyUrl = `https://api.apify.com/v2/acts/epctex~youtube-video-downloader/runs?token=${apifyToken}&webhooks=${encodeURIComponent(base64Webhooks)}`;
      
      const apifyRes = await fetch(apifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: [{ url: url }]
        })
      });

      if (!apifyRes.ok) {
        const errText = await apifyRes.text();
        return NextResponse.json({ error: 'Apify server error: ' + errText }, { status: apifyRes.status });
      }

      await adminDb.collection('notifications').add({
        title: "YouTube Download Started",
        message: `The server is now converting "${title}" from YouTube via Apify. You will be notified once it finishes uploading and is pushed to the folder.`,
        type: "info",
        link: "/admin/library",
        createdAt: Date.now(),
        isGlobal: true,
        readBy: [],
        clearedBy: []
      });

      const data = await apifyRes.json();
      return NextResponse.json(data);
    } else {
      // Original AWS EC2 logic for Zoom
      const serverHost = process.env.NEXT_PUBLIC_RTMP_SERVER_HOST || '13.60.252.104';
      const serverPort = process.env.RTMP_HTTP_PORT || '8000';
      const callbackSecret = process.env.RTMP_CALLBACK_SECRET || 'change-me-to-a-random-string';

      const awsUrl = 'http://' + serverHost + ':' + serverPort + '/api/generic-download';
      const webhookUrl = websiteUrl + '/api/bunny/aws-webhook';

      const res = await fetch(awsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          password,
          title,
          metadata,
          webhookUrl,
          secret: callbackSecret
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json({ error: 'AWS server error: ' + errText }, { status: res.status });
      }

      const data = await res.json();

      await adminDb.collection('notifications').add({
        title: "Recording Download Started",
        message: `The server is now downloading "${title}". You will be notified once it finishes uploading and is pushed to the folder.`,
        type: "info",
        link: "/admin/library",
        createdAt: Date.now(),
        isGlobal: true,
        readBy: [],
        clearedBy: []
      });

      return NextResponse.json(data);
    }

  } catch (error: any) {
    console.error('[Generic Download] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
