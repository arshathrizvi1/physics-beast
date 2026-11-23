import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { resolveCorsOrigin } from '@/security/zero-trust-gate';
import { getAuthenticatedCaller } from '@/security/session';
import {
  getUserEntitlementContext,
  hasCourseOrFolderEntitlement,
  extractR2KeyFromUrl,
} from '@/security/entitlement';

const DEFAULT_R2_BASE = 'https://pub-204a9d6785a841bc8ffc778a5f777b32.r2.dev';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await context.params;
    const referer = request.headers.get('referer') || '';
    const origin = request.headers.get('origin') || '';
    const userAgent = request.headers.get('user-agent') || '';
    const allowedOrigin = resolveCorsOrigin(request);

    // 1. Block IDM and standalone downloader grabbers
    const isDownloaderUA = /idm|internet download manager|fdm|curl|wget|python|aria2|jdownloader|yt-dlp/i.test(userAgent);
    if (isDownloaderUA) {
      return new NextResponse(
        'Access Denied: External download managers are prohibited on Brilliant Academy.',
        { status: 403 }
      );
    }

    // 2. Require strictly verified authenticated caller (never trust Host header alone!)
    const caller = await getAuthenticatedCaller(request);
    const ent = await getUserEntitlementContext(caller);
    if (!ent || ent.isBanned) {
      return new NextResponse(
        'Unauthorized: Active authenticated session required to stream lessons.',
        { status: 401 }
      );
    }

    // 3. Enforce strict player origin/referer in production
    const refOrOrigin = referer || origin;
    const isAllowedOrigin = (() => {
      if (process.env.NODE_ENV !== 'production') return true;
      if (!refOrOrigin) return false;
      try {
        const parsedHost = new URL(refOrOrigin).hostname.toLowerCase();
        return (
          parsedHost === 'brillliantacademy.site' ||
          parsedHost === 'www.brillliantacademy.site' ||
          parsedHost === 'brilliantacademy.site' ||
          parsedHost === 'www.brilliantacademy.site' ||
          parsedHost === 'brilliantacademy.vercel.app' ||
          parsedHost === 'brilliant-academy.vercel.app'
        );
      } catch {
        return false;
      }
    })();

    if (!isAllowedOrigin) {
      return new NextResponse(
        'Access Denied: Playback outside the official Brilliant Academy video player is prohibited.',
        { status: 403 }
      );
    }

    const filePath = path && path.length > 0 ? path.join('/') : '';
    if (!filePath || filePath.includes('..') || filePath.includes('\0') || !/^[a-zA-Z0-9_\-\.\/]+$/.test(filePath)) {
      return new NextResponse('Bad Request: Invalid file path', { status: 400 });
    }

    // 4. Verify student payment/folder entitlement for this video directory prefix
    if (!ent.isStaff) {
      const videoDir = filePath.includes('/') ? filePath.slice(0, filePath.lastIndexOf('/')) : filePath;
      const videosSnap = await adminDb.collection('videos').limit(500).get();
      let authorized = false;

      for (const docSnap of videosSnap.docs) {
        const v = docSnap.data() || {};
        const keys = [extractR2KeyFromUrl(v.r2Url || ''), extractR2KeyFromUrl(v.url || '')].filter(Boolean) as string[];
        const matches = keys.some((k) => k === filePath || k.startsWith(`${videoDir}/`));
        if (matches) {
          if (
            hasCourseOrFolderEntitlement(ent, {
              courseId: v.courseId,
              folderId: v.folderId,
              isFree: v.isFree === true,
            })
          ) {
            authorized = true;
            break;
          }
        }
      }

      if (!authorized) {
        return new NextResponse(
          'Payment Required: You do not have active access to this lesson.',
          { status: 403 }
        );
      }
    }

    const hostParam = request.nextUrl.searchParams.get('host');
    let r2PublicBase = (process.env.R2_PUBLIC_URL || DEFAULT_R2_BASE).replace(/\/$/, '');

    if (hostParam) {
      const cleanHost = hostParam.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim().toLowerCase();
      const configuredHost = (() => {
        try {
          return new URL(r2PublicBase).hostname.toLowerCase();
        } catch {
          return '';
        }
      })();
      const allowedR2Hosts = new Set(
        [configuredHost, 'pub-204a9d6785a841bc8ffc778a5f777b32.r2.dev'].filter(Boolean)
      );
      if (allowedR2Hosts.has(cleanHost)) {
        r2PublicBase = `https://${cleanHost}`;
      }
    }

    let upstreamRes = await fetch(`${r2PublicBase}/${filePath}`, {
      headers: {
        'User-Agent': 'BrilliantAcademy-SecureProxy/1.0',
      },
    });

    if (!upstreamRes.ok && upstreamRes.status === 404 && r2PublicBase !== DEFAULT_R2_BASE) {
      upstreamRes = await fetch(`${DEFAULT_R2_BASE}/${filePath}`, {
        headers: {
          'User-Agent': 'BrilliantAcademy-SecureProxy/1.0',
        },
      });
    }

    if (!upstreamRes.ok) {
      return new NextResponse(`Video chunk not available (${upstreamRes.status})`, {
        status: upstreamRes.status,
      });
    }

    if (filePath.endsWith('.m3u8')) {
      let manifestText = await upstreamRes.text();
      if (hostParam) {
        manifestText = manifestText
          .split('\n')
          .map((line) => {
            const trimmed = line.trim();
            if (
              trimmed &&
              !trimmed.startsWith('#') &&
              !trimmed.startsWith('http://') &&
              !trimmed.startsWith('https://')
            ) {
              const separator = trimmed.includes('?') ? '&' : '?';
              return `${trimmed}${separator}host=${encodeURIComponent(hostParam)}`;
            }
            return line;
          })
          .join('\n');
      }

      const responseHeaders = new Headers();
      responseHeaders.set('Content-Type', 'application/vnd.apple.mpegurl');
      responseHeaders.set('Cache-Control', 'private, no-cache, no-store');
      responseHeaders.set('Access-Control-Allow-Origin', allowedOrigin);
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

      return new NextResponse(manifestText, {
        status: 200,
        headers: responseHeaders,
      });
    }

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'application/octet-stream');
    responseHeaders.set('Content-Disposition', 'inline; filename="stream.bin"');
    responseHeaders.set('Cache-Control', 'private, no-store');
    responseHeaders.set('Access-Control-Allow-Origin', allowedOrigin);
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

    return new NextResponse(upstreamRes.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[Secure HLS Proxy Error]:', error);
    return new NextResponse(error.message || 'Streaming error', { status: 500 });
  }
}
