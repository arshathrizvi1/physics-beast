import { extractYoutubeId } from './playerDeviceControl';

// Fast, public Piped API mirrors that return raw media streams
export const PIPED_API_MIRRORS = [
  'https://pipedapi.ducks.party',
  'https://api.piped.private.coffee',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.leptons.xyz',
];

export interface PipedResolvedStream {
  streamUrl: string;
  isHls: boolean;
  quality?: string;
  sourceInstance: string;
  availableStreams?: Array<{ quality: string; url: string }>;
}

// In-memory cache to guarantee instant playback on repeat access
const streamCache = new Map<string, { stream: PipedResolvedStream; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Automatically races active Piped mirrors in parallel.
 * Returns the fastest, non-overloaded stream URL (MP4 / HLS).
 * If all mirrors fail, returns null so the player seamlessly falls back to direct YouTube.
 */
export async function resolvePipedStream(
  videoIdOrUrl: string,
  timeoutMs = 3500
): Promise<PipedResolvedStream | null> {
  const videoId = extractYoutubeId(videoIdOrUrl);
  if (!videoId) return null;

  // 1. Instant cache hit
  const cached = streamCache.get(videoId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.stream;
  }

  // 2. Fetcher for a single instance with timeout
  const fetchFromMirror = async (mirror: string): Promise<PipedResolvedStream> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${mirror}/streams/${videoId}`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`Mirror ${mirror} HTTP ${res.status}`);
      }

      const data = await res.json();
      clearTimeout(timer);

      // Check for playable HLS stream
      if (data.hls && typeof data.hls === 'string' && data.hls.startsWith('http')) {
        return {
          streamUrl: data.hls,
          isHls: true,
          quality: 'Auto',
          sourceInstance: mirror,
        };
      }

      // Check for combined audio+video MP4 streams
      if (Array.isArray(data.videoStreams) && data.videoStreams.length > 0) {
        const playable = data.videoStreams.filter((s: any) => s.url && !s.videoOnly);

        if (playable.length > 0) {
          const sorted = [...playable].sort((a: any, b: any) => {
            const getQ = (q: string) => parseInt(q) || 0;
            return getQ(b.quality) - getQ(a.quality);
          });

          const best = sorted[0];
          const available = sorted.map((s: any) => ({
            quality: s.quality || 'Auto',
            url: s.url,
          }));

          return {
            streamUrl: best.url,
            isHls: best.format === 'HLS' || best.url.includes('.m3u8'),
            quality: best.quality,
            sourceInstance: mirror,
            availableStreams: available,
          };
        }
      }

      throw new Error(`No audio+video streams on ${mirror}`);
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    // 3. Race all active mirrors simultaneously using Promise.any
    const winner = await Promise.any(
      PIPED_API_MIRRORS.map(mirror => fetchFromMirror(mirror))
    );

    if (winner && winner.streamUrl) {
      streamCache.set(videoId, { stream: winner, timestamp: Date.now() });
      return winner;
    }
  } catch {
    // If all Piped mirrors fail or timeout, silently return null
  }

  return null;
}
