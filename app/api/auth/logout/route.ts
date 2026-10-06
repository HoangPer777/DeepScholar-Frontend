import { NextResponse } from 'next/server';

import { clearAuthCookies } from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json(
    { detail: 'Logged out successfully.' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
  clearAuthCookies(response);
  return response;
}
