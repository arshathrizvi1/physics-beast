import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { validatePresignedUploadPayload } from '@/security/schemas';
import {
  withZeroTrustGate,
  parseAndVerifyJsonBody,
} from '@/security/zero-trust-gate';
import { blacklistActor, engageCryptographicTarpit } from '@/security/rate-limit';

const s3Client = new S3Client({
  region: 'de',
  endpoint: process.env.BUNNY_PDF_ENDPOINT || 'https://de-s3.storage.bunnycdn.com',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.BUNNY_PDF_STORAGE_ZONE || 'brillienat-pdf',
    secretAccessKey: process.env.BUNNY_PDF_PASSWORD || '',
  },
});

export const POST = withZeroTrustGate(
  {
    scope: 'bunny_s3_presigned_upload',
    limit: 25,
    windowMs: 60 * 1000,
    requireAuth: 'authenticated',
  },
  async (req, ctx) => {
    const parsed = await parseAndVerifyJsonBody(req, ctx);
    if (!parsed.ok) return parsed.response;

    const validation = validatePresignedUploadPayload(parsed.body);
    if (!validation.valid || !validation.data) {
      if (validation.honeypot) {
        blacklistActor({
          ip: ctx.ip,
          fingerprint: ctx.fingerprint,
          reason: validation.reason || 'UPLOAD_PATH_TAMPERING',
        });
        await engageCryptographicTarpit(1500, 2500);
        return NextResponse.json(
          { error: 'ERR_REQ_REJECTED', code: 'ERR_REQ_REJECTED', traceId: ctx.traceId },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: validation.error || 'Filename and contentType are required' },
        { status: 400 }
      );
    }

    const { filename, contentType, folder } = validation.data;
    const isStaff = Boolean(ctx.caller?.isAdmin);
    const STUDENT_ALLOWED_FOLDERS = new Set([
      'student-nic',
      'support-issues',
      'payment-slips',
      'payment-receipts',
      'receipts',
      'avatars',
    ]);
    const STUDENT_ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

    if (!isStaff) {
      if (!STUDENT_ALLOWED_FOLDERS.has(folder)) {
        return NextResponse.json(
          { error: 'Forbidden: Students may only upload to designated student folders.' },
          { status: 403 }
        );
      }
      if (!STUDENT_ALLOWED_MIMES.has(contentType)) {
        return NextResponse.json(
          { error: 'Unsupported file type: Only JPEG, PNG, and WEBP images are permitted.' },
          { status: 415 }
        );
      }
    }

    const bucketName = process.env.BUNNY_PDF_STORAGE_ZONE || 'brillienat-pdf';
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const uidPrefix = !isStaff && ctx.caller?.uid ? `${ctx.caller.uid.replace(/[^a-zA-Z0-9_-]/g, '')}/` : '';
    const key = folder
      ? `${folder}/${uidPrefix}${timestamp}_${cleanFilename}`
      : `uploads/${uidPrefix}${timestamp}_${cleanFilename}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: isStaff ? 3600 : 600 });
    const publicUrl = process.env.BUNNY_PDF_PUBLIC_URL
      ? `${process.env.BUNNY_PDF_PUBLIC_URL}/${key}`
      : `https://${bucketName}.b-cdn.net/${key}`;

    return NextResponse.json({
      presignedUrl,
      publicUrl,
      key,
    });
  }
);
