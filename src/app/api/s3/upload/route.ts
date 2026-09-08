import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function POST(req: Request) {
  try {
    const { filename, contentType, folder } = await req.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Filename and contentType are required' }, { status: 400 });
    }

    const bucketName = process.env.AWS_BUCKET_NAME || 'brillinat-academy-1';
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const key = folder ? (folder + '/' + timestamp + '_' + cleanFilename) : ('uploads/' + timestamp + '_' + cleanFilename);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    const region = process.env.AWS_REGION || 'eu-north-1';
    const publicUrl = 'https://' + bucketName + '.s3.' + region + '.amazonaws.com/' + key;

    return NextResponse.json({
      presignedUrl,
      publicUrl,
      key,
    });
  } catch (error: any) {
    console.error('S3 Presigned URL error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate presigned URL' }, { status: 500 });
  }
}
