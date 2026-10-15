import type { NextRequest, NextResponse } from 'next/server';

export const ACCESS_TOKEN_COOKIE = 'deepscholar_access_token';
export const REFRESH_TOKEN_COOKIE = 'deepscholar_refresh_token';

const ACCESS_TOKEN_MAX_AGE = 60 * 60;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

export const AUTH_TOKEN_RESPONSE_PATHS = new Set([
  'auth/register',
  'auth/login',
  'auth/google',
  'auth/facebook',
  'auth/become-author',
]);

export const AUTH_SESSION_PATHS = new Set([
  'auth/login',
  'auth/google',
  'auth/facebook',
  'auth/become-author',
]);

type AuthPayload = {
  access?: unknown;
  refresh?: unknown;
};

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/api',
    maxAge,
  };
}

export function setAuthCookies(response: NextResponse, payload: AuthPayload): void {
  if (typeof payload.access === 'string' && payload.access.trim()) {
    response.cookies.set(
      ACCESS_TOKEN_COOKIE,
      payload.access,
      cookieOptions(ACCESS_TOKEN_MAX_AGE),
    );
  }

  if (typeof payload.refresh === 'string' && payload.refresh.trim()) {
    response.cookies.set(
      REFRESH_TOKEN_COOKIE,
      payload.refresh,
      cookieOptions(REFRESH_TOKEN_MAX_AGE),
    );
  }
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_TOKEN_COOKIE, '', cookieOptions(0));
  response.cookies.set(REFRESH_TOKEN_COOKIE, '', cookieOptions(0));
}

export function stripTokenFields(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }

  const safePayload = { ...(payload as Record<string, unknown>) };
  delete safePayload.access;
  delete safePayload.refresh;
  return safePayload;
}

export function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  try {
    const originUrl = new URL(origin);
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0].trim();
    const requestHost = forwardedHost || request.headers.get('host');
    const forwardedProtocol = request.headers.get('x-forwarded-proto')?.split(',')[0].trim();
    const requestProtocol = forwardedProtocol
      ? `${forwardedProtocol}:`
      : request.nextUrl.protocol;

    if (requestHost) {
      return originUrl.host === requestHost && originUrl.protocol === requestProtocol;
    }

    return originUrl.origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}
