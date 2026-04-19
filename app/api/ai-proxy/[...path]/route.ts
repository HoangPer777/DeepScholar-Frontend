import { NextRequest, NextResponse } from 'next/server';

const AI_URL = process.env.AI_URL || 'http://localhost:8001/api';

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path, 'GET');
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path, 'POST');
}

async function proxyRequest(req: NextRequest, pathSegments: string[], method: string) {
  const path = pathSegments.join('/');
  const search = req.nextUrl.search;
  const targetUrl = `${AI_URL}/${path}${search}`;

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
    return NextResponse.json({ detail: err.message }, { status: 502 });
  }
}
