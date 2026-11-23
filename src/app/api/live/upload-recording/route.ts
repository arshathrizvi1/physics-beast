import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { withZeroTrustGate, parseAndVerifyJsonBody } from '@/security/zero-trust-gate';
import { sanitizeText } from '@/security/sanitize';
import fs from 'fs';
import path from 'path';

const ALLOWED_RECORDINGS_ROOT = path.resolve(process.env.RECORDINGS_DIR || '/var/recordings');

export const POST = withZeroTrustGate(
  {
    scope: 'live_upload_recording',
    limit: 10,
    windowMs: 60 * 1000,
    requireAuth: 'admin',
  },
  async (request, ctx) => {
    try {
      const parsed = await parseAndVerifyJsonBody<{
        streamKey?: string;
        filePath?: string;
      }>(request, ctx);
      if (!parsed.ok) return parsed.response;

      const streamKey = sanitizeText(parsed.body.streamKey, 128);
      const filePath = String(parsed.body.filePath || '').trim();

      if (!streamKey || !filePath) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
      }

      // Security Check: Strictly jail recording path inside ALLOWED_RECORDINGS_ROOT, block symlinks & non-video files
      const resolvedPath = path.resolve(ALLOWED_RECORDINGS_ROOT, filePath.replace(/^\/+/, ''));
      const isInsideRoot =
        resolvedPath === ALLOWED_RECORDINGS_ROOT ||
        resolvedPath.startsWith(ALLOWED_RECORDINGS_ROOT + path.sep);
      if (
        !isInsideRoot ||
        filePath.includes('..') ||
        filePath.includes('\0') ||
        !/\.(mp4|flv|mkv)$/i.test(resolvedPath)
      ) {
        return NextResponse.json({ error: 'Invalid recording file path' }, { status: 400 });
      }

      if (!fs.existsSync(resolvedPath) || fs.lstatSync(resolvedPath).isSymbolicLink()) {
        return NextResponse.json({ error: 'Recording file not found on disk' }, { status: 404 });
      }

      // Find the live_classes doc that matches this streamKey
      const liveSnapshot = await adminDb
        .collection('live_classes')
        .where('streamKey', '==', streamKey)
        .limit(1)
        .get();

      if (liveSnapshot.empty) {
        return NextResponse.json({ error: 'Live class not found' }, { status: 404 });
      }

      const liveDoc = liveSnapshot.docs[0];
      const liveData = liveDoc.data();

      if (!liveData.targetFolderId) {
        console.log('No target folder selected for this stream. Skipping VOD upload.');
        return NextResponse.json({ message: 'Skipped - no target folder' });
      }

      const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
      const apiKey = process.env.BUNNY_STREAM_API_KEY;

      if (!libraryId || !apiKey) {
        throw new Error('Bunny Stream API keys are not configured');
      }

      console.log(`Creating Bunny video for: ${liveData.title}`);

      // 1. Create the video in Bunny Stream
      const createRes = await fetch(
        `https://video.bunnycdn.com/library/${libraryId}/videos`,
        {
          method: 'POST',
          headers: {
            AccessKey: apiKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ title: `${liveData.title} (Live Recording)` }),
        }
      );

      if (!createRes.ok) {
        const errText = await createRes.text();
        throw new Error(`Failed to create video in Bunny: ${errText}`);
      }

      const videoData = await createRes.json();
      const videoId = videoData.guid;

      console.log(`Video created with ID: ${videoId}. Starting upload...`);

      // 2. Read file and upload
      const fileStream = fs.createReadStream(resolvedPath);
      const stats = fs.statSync(resolvedPath);

      const uploadRes = await fetch(
        `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
        {
          method: 'PUT',
          headers: {
            AccessKey: apiKey,
            'Content-Type': 'application/octet-stream',
            'Content-Length': stats.size.toString(),
          },
          body: fileStream,
          // @ts-ignore
          duplex: 'half',
        } as any
      );

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`Upload failed: ${errText}`);
      }

      console.log('Upload successful. Updating Firestore...');

      // 3. Add to target folder in Firestore
      const folderRef = adminDb.collection('folders').doc(liveData.targetFolderId);
      const newVideoRef = adminDb.collection('videos').doc();

      const newVideo = {
        id: newVideoRef.id,
        title: `${liveData.title} (Live Recording)`,
        videoId: videoId,
        libraryId: libraryId,
        type: 'video',
        createdAt: Date.now(),
        views: 0,
        isReady: true,
        processingStatus: 'ready',
      };

      await newVideoRef.set(newVideo);

      await adminDb.runTransaction(async (t) => {
        const doc = await t.get(folderRef);
        if (doc.exists) {
          const data = doc.data();
          const items = data?.items || [];
          t.update(folderRef, {
            items: [...items, { id: newVideoRef.id, type: 'video' }],
          });
        }
      });

      // Mark live class as uploaded
      await liveDoc.ref.update({
        vodUploaded: true,
        vodVideoId: videoId,
      });

      console.log('Successfully completed post-live VOD pipeline.');
      return NextResponse.json({ success: true, videoId });
    } catch (error: any) {
      console.error('VOD Upload Pipeline Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
);
