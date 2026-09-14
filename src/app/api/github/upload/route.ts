import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { videoUrl, videoId, libraryId, metadata } = await req.json();

    if (!videoUrl || !videoId) {
      return NextResponse.json({ success: false, error: 'videoUrl and videoId are required' }, { status: 400 });
    }

    // Trigger the GitHub Action
    const response = await fetch(`https://api.github.com/repos/arshathrizvi1/physics-beast/dispatches`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        // Ensure you add GITHUB_PAT in your Vercel Environment Variables
        'Authorization': `token ${process.env.GITHUB_PAT}`, 
      },
      body: JSON.stringify({
        event_type: 'bunny-upload',
        client_payload: {
          videoUrl,
          videoId,
          libraryId,
          metadata
        }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('GitHub API Error:', err);
      return NextResponse.json({ success: false, error: 'Failed to trigger GitHub Action' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'GitHub Action started successfully' });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
