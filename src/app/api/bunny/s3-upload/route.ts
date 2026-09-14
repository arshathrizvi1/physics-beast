import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: 'de', // Bunny S3 requires a region string, but value doesn't strictly matter
  endpoint: process.env.BUNNY_PDF_ENDPOINT || 'https://de-s3.storage.bunnycdn.com',
  forcePathStyle: true, // Crucial for BunnyCDN and other S3-compatible providers
  credentials: {
    accessKeyId: process.env.BUNNY_PDF_STORAGE_ZONE || 'brillienat-pdf',
    secretAccessKey: process.env.BUNNY_PDF_PASSWORD || '',
  },
});

export async function POST(req: Request) {
  try {
    const { filename, contentType, folder } = await req.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Filename and contentType are required' }, { status: 400 });
    }

    const bucketName = process.env.BUNNY_PDF_STORAGE_ZONE || 'brillienat-pdf';
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const key = folder ? (folder + '/' + timestamp + '_' + cleanFilename) : ('uploads/' + timestamp + '_' + cleanFilename);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });

    // Bunny S3 presigned URLs work exactly like AWS S3
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    // Default Bunny Pull Zone format: https://<storagezone>.b-cdn.net/
    const publicUrl = process.env.BUNNY_PDF_PUBLIC_URL 
      ? `${process.env.BUNNY_PDF_PUBLIC_URL}/${key}`
      : `https://${bucketName}.b-cdn.net/${key}`;

    return NextResponse.json({
      presignedUrl,
      publicUrl,
      key,
    });
  } catch (error: any) {
    console.error('Bunny S3 Presigned URL error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate presigned URL' }, { status: 500 });
  }
}
