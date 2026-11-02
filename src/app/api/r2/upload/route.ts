import { NextResponse } from 'next/server';
import { withZeroTrustGate } from '@/security/zero-trust-gate';

export const dynamic = 'force-dynamic';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB max

export const POST = withZeroTrustGate(
  {
    scope: 'r2_upload',
    limit: 20,
    windowMs: 60 * 1000,
    requireAuth: 'teacher_or_admin',
  },
  async (req: Request) => {
    try {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const folderRaw = (formData.get('folder') as string) || 'course-resources';
      const folder = folderRaw.replace(/[^a-zA-Z0-9_-]/g, '');

      if (!file) {
        return NextResponse.json({ error: 'File is required' }, { status: 400 });
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'File size exceeds maximum permitted limit (50MB)' },
          { status: 413 }
        );
      }

      const mimeType = file.type || 'application/octet-stream';
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return NextResponse.json(
          { error: `File type ${mimeType} is not permitted` },
          { status: 415 }
        );
      }

      const cleanFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const timestamp = Date.now();
      const key = `${folder}/${timestamp}_${cleanFilename}`;

      const host = process.env.SITE_URL || 'https://brillliantacademy.site';
      const uploadUrl = `${host}/api/r2-media/${encodeURIComponent(key)}`;
      const bytes = await file.arrayBuffer();

      const r2Res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': mimeType,
        },
        body: bytes,
      });

      if (!r2Res.ok) {
        throw new Error(`R2 upload failed with status ${r2Res.status}`);
      }

      return NextResponse.json({
        success: true,
        key,
        publicUrl: `${host}/api/r2-media/${encodeURIComponent(key)}`,
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
    }
  }
);
