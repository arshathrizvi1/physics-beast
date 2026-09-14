import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, title, metadata } = body;

    if (!url || !metadata) {
      return NextResponse.json({ error: 'Missing url or metadata' }, { status: 400 });
    }

    const githubToken  = process.env.GITHUB_ACTIONS_TOKEN;
    const githubOwner  = process.env.GITHUB_REPO_OWNER || 'arshathrizvi1';
    const githubRepo   = process.env.GITHUB_REPO_NAME  || 'physics-beast';

    if (!githubToken) {
      return NextResponse.json({ error: 'GITHUB_ACTIONS_TOKEN not configured in Vercel env' }, { status: 500 });
    }

    // Trigger the GitHub Actions workflow via repository_dispatch
    const dispatchUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/dispatches`;

    const dispatchRes = await fetch(dispatchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: 'youtube-download',
        client_payload: {
          url,
          title,
          metadata,
        },
      }),
    });

    if (!dispatchRes.ok) {
      const errText = await dispatchRes.text();
      console.error('[GitHub Trigger] Failed:', errText);
      return NextResponse.json({ error: 'Failed to trigger GitHub Actions: ' + errText }, { status: dispatchRes.status });
    }

    // Send admin notification that the job has started
    await adminDb.collection('notifications').add({
      title: '🎬 YouTube Download Started (GitHub)',
      message: `"${title}" is being downloaded via GitHub Actions (free, fast). You will be notified when it finishes uploading to BunnyCDN.`,
      type: 'info',
      link: '/admin/library',
      createdAt: Date.now(),
      isGlobal: true,
      readBy: [],
      clearedBy: [],
    });

    return NextResponse.json({ success: true, message: 'GitHub Actions job triggered successfully' });

  } catch (error: any) {
    console.error('[GitHub Trigger] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
