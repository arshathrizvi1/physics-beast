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
    const bucketName = process.env.BUNNY_PDF_STORAGE_ZONE || 'brillienat-pdf';
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const key = folder
      ? `${folder}/${timestamp}_${cleanFilename}`
      : `uploads/${timestamp}_${cleanFilename}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
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
