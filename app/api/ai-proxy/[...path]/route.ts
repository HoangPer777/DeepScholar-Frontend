import { NextRequest, NextResponse } from 'next/server';
import { resolveAiUrl } from './route-helpers';

export const maxDuration = 60; // Vercel: allow up to 60s per proxy request
export const dynamic = 'force-dynamic'; // Always read env vars at runtime

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path, 'GET');
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path, 'POST');
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

  let body: BodyInit | undefined;
  if (method === 'POST') {
    body = await req.text();
  }

  try {
    const res = await fetch(targetUrl, { method, headers, body });
    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' },
    });
  } catch (err: any) {
    // Robust fallback for Docker networking issues
    if (targetUrl.includes('host.docker.internal')) {
      try {
        const fallbackUrl = targetUrl.replace('host.docker.internal', 'deepscholar-ai');
        const fallbackRes = await fetch(fallbackUrl, { method, headers, body });
        const fallbackData = await fallbackRes.text();
        return new NextResponse(fallbackData, {
          status: fallbackRes.status,
          headers: { 'Content-Type': fallbackRes.headers.get('content-type') || 'application/json' },
        });
      } catch (fallbackErr: any) {
        try {
          const localhostUrl = targetUrl.replace('host.docker.internal', 'localhost');
          const localhostRes = await fetch(localhostUrl, { method, headers, body });
          const localhostData = await localhostRes.text();
          return new NextResponse(localhostData, {
            status: localhostRes.status,
            headers: { 'Content-Type': localhostRes.headers.get('content-type') || 'application/json' },
          });
        } catch (localErr: any) {
          return NextResponse.json(
            { detail: `Cannot reach AI service at ${aiUrl} or fallback deepscholar-ai or localhost: ${err.message}` },
            { status: 502 }
          );
        }
      }
    }

    return NextResponse.json(
      { detail: `Cannot reach AI service at ${aiUrl}: ${err.message}` },
      { status: 502 }
    );
  }
}
