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

  const aiUrl = resolveAiUrl(); // sync — no probe, no await
  const targetUrl = `${aiUrl}/${path}${search}`;

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
    return NextResponse.json(
      { detail: `Cannot reach AI service at ${aiUrl}: ${err.message}` },
      { status: 502 }
    );
  }
}
