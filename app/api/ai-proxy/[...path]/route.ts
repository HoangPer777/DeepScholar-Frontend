import { NextRequest, NextResponse } from 'next/server';
import { resolveAiUrl } from './route-helpers';

export const maxDuration = 60; // Vercel: allow up to 60s per proxy request
export const dynamic = 'force-dynamic'; // Always read env vars at runtime

// Timeout for each individual fetch attempt (ms).
// Polling status calls should return in <1s; POST calls may take longer.
// Keep well under maxDuration so we have time for fallback attempts.
const FETCH_TIMEOUT_MS = 25_000;

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path, 'GET');
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path, 'POST');
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function proxyRequest(req: NextRequest, pathSegments: string[], method: string) {
  const path = pathSegments.join('/');
  const search = req.nextUrl.search;
  
  // Next.js strips trailing slashes, but FastAPI requires it for some endpoints (like /chat/)
  const hasTrailingSlash = req.nextUrl.pathname.endsWith('/') || path === 'chat';
  const finalPath = hasTrailingSlash ? path + '/' : path;

  const aiUrl = resolveAiUrl(); // sync — no probe, no await
  const targetUrl = `${aiUrl}/${finalPath}${search}`;

  const headers: Record<string, string> = {
    'Content-Type': req.headers.get('content-type') || 'application/json',
  };

  const auth = req.headers.get('authorization');
  if (auth) headers['Authorization'] = auth;

  let body: string | undefined;
  if (method === 'POST') {
    body = await req.text();
  }

  const fetchOptions: RequestInit = { method, headers, body };

  // Try primary URL first, then Docker service name, then localhost.
  // Each attempt has an individual timeout to prevent hanging.
  const urlsToTry = buildFallbackChain(aiUrl, targetUrl);

  let lastError: string = 'unknown error';
  for (const url of urlsToTry) {
    try {
      const res = await fetchWithTimeout(url, fetchOptions, FETCH_TIMEOUT_MS);
      const data = await res.text();
      return new NextResponse(data, {
        status: res.status,
        headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' },
      });
    } catch (err: any) {
      lastError = err.message || String(err);
      // AbortError means timeout — try next URL
      // Other errors (ECONNREFUSED, etc.) — also try next URL
      continue;
    }
  }

  return NextResponse.json(
    { detail: `Cannot reach AI service. Tried: ${urlsToTry.join(', ')}. Last error: ${lastError}` },
    { status: 502 },
  );
}

/**
 * Build an ordered list of URLs to try.
 * Prefer Docker service name (deepscholar-ai) over host.docker.internal
 * because service names are more reliable inside Docker networks.
 */
function buildFallbackChain(aiUrl: string, targetUrl: string): string[] {
  const urls: string[] = [];

  // If AI_URL uses host.docker.internal, try deepscholar-ai first (more reliable in Docker)
  if (aiUrl.includes('host.docker.internal')) {
    urls.push(targetUrl.replace('host.docker.internal', 'deepscholar-ai'));
    urls.push(targetUrl); // original host.docker.internal
    urls.push(targetUrl.replace('host.docker.internal', 'localhost'));
  } else {
    // Production or bare local — just use the configured URL
    urls.push(targetUrl);
  }

  return urls;
}
