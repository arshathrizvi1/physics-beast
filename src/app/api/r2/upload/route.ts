import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'course-resources';

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
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
        'Content-Type': file.type || 'application/pdf',
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
