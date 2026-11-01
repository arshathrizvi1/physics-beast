import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

async function test(forcePathStyle: boolean) {
  const s3Client = new S3Client({
    region: 'de',
    endpoint: 'https://de-s3.storage.bunnycdn.com',
    forcePathStyle: forcePathStyle,
    credentials: {
      accessKeyId: 'brillienat-pdf',
      secretAccessKey: '83e700f0-bfb6-4011-9462babff1c5-4477-4a07',
    },
  });

  const command = new PutObjectCommand({
    Bucket: 'brillienat-pdf',
    Key: 'test.txt',
    ContentType: 'text/plain',
  });

  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    console.log(`URL (forcePathStyle=${forcePathStyle}):`, url);

    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      body: 'hello world',
    });
    console.log(`Response (forcePathStyle=${forcePathStyle}):`, res.status, res.statusText);
    const text = await res.text();
    console.log('Body:', text);
  } catch (e: any) {
    console.log(`Fetch Error (forcePathStyle=${forcePathStyle}):`, e.message);
  }
}

async function run() {
  await test(true);
  console.log('---');
  await test(false);
}

run();
