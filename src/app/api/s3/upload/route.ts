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
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export const POST = withZeroTrustGate(
  {
    scope: 's3_presigned_upload',
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
    const bucketName = process.env.AWS_BUCKET_NAME || 'brillinat-academy-1';
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
    const region = process.env.AWS_REGION || 'eu-north-1';
    const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

    return NextResponse.json({
      presignedUrl,
      publicUrl,
      key,
    });
  }
);
