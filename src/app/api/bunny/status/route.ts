import { NextResponse } from 'next/server';
import { withZeroTrustGate } from '@/security/zero-trust-gate';
import { sanitizeText } from '@/security/sanitize';

export const GET = withZeroTrustGate(
  {
    scope: 'bunny_video_status',
    limit: 60,
    windowMs: 60 * 1000,
    requireAuth: 'teacher_or_admin',
  },
  async (request) => {
    try {
      const { searchParams } = new URL(request.url);
      const videoId = sanitizeText(searchParams.get('videoId'), 128);

      if (!videoId) {
        return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
      }

      const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
      const apiKey = process.env.BUNNY_STREAM_API_KEY;

      if (!libraryId || !apiKey) {
        return NextResponse.json({ error: 'Bunny API keys not configured' }, { status: 500 });
      }

      const res = await fetch(
        `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
        {
          headers: {
            AccessKey: apiKey,
            Accept: 'application/json',
          },
        }
      );

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: err }, { status: res.status });
      }

      const videoData = await res.json();

      const statusMap: Record<number, string> = {
        0: 'created',
        1: 'uploaded',
        2: 'processing',
        3: 'finished',
        4: 'error',
        5: 'failed',
      };

      return NextResponse.json({
        videoId,
        status: videoData.status,
        statusName: statusMap[videoData.status] || 'unknown',
        isReady: videoData.status === 3,
        encodeProgress: videoData.encodeProgress || 0,
        title: videoData.title,
      });
    } catch (error: any) {
      console.error('Error checking Bunny video status:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
);
