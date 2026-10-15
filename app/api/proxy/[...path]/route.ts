import { NextRequest, NextResponse } from 'next/server';

import {
  ACCESS_TOKEN_COOKIE,
  AUTH_SESSION_PATHS,
  AUTH_TOKEN_RESPONSE_PATHS,
  clearAuthCookies,
  isSameOriginRequest,
  setAuthCookies,
  stripTokenFields,
} from '@/lib/auth-cookies';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000/api/v1';

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path, 'GET');
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path, 'POST');
}

export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path, 'PUT');
}

export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path, 'PATCH');
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path, 'DELETE');
}

async function proxyRequest(req: NextRequest, pathSegments: string[], method: string) {
  const path = pathSegments.join('/');
  const search = req.nextUrl.search;
  const targetUrl = `${BACKEND_URL}/${path}/${search}`;
  const normalizedPath = path.replace(/^\/+|\/+$/g, '');

  if (method !== 'GET' && !isSameOriginRequest(req)) {
    return NextResponse.json({ detail: 'Cross-origin request rejected.' }, { status: 403 });
  }

  const headers: Record<string, string> = {
    'Content-Type': req.headers.get('content-type') || 'application/json',
  };

  if (method === 'POST' && normalizedPath === 'ai/trigger') {
    const idempotencyKey = req.headers.get('idempotency-key');
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  }

  const accessToken = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  let body: BodyInit | undefined;
  if (method !== 'GET' && method !== 'DELETE') {
    body = await req.text();
  }

  try {
    const res = await fetch(targetUrl, { method, headers, body });
    const data = await res.text();

    if (AUTH_TOKEN_RESPONSE_PATHS.has(normalizedPath)) {
      try {
        const payload = JSON.parse(data) as Record<string, unknown>;
        const safeResponse = NextResponse.json(stripTokenFields(payload), {
          status: res.status,
          headers: { 'Cache-Control': 'no-store' },
        });
        if (res.ok && AUTH_SESSION_PATHS.has(normalizedPath)) {
          setAuthCookies(safeResponse, payload);
        }
        return safeResponse;
      } catch {
        // Preserve a non-JSON provider response without attempting to set cookies.
      }
    }

    const response = new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' },
    });
    if (res.status === 401 && !AUTH_TOKEN_RESPONSE_PATHS.has(normalizedPath)) {
      clearAuthCookies(response);
    }
    return response;
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 502 });
  }
}
