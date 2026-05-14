/**
 * Shared helpers for ai-proxy route.
 *
 * URL resolution — đọc AI_URL env var, không probe, không cache.
 *
 * Cấu hình theo môi trường:
 *  - Local Docker:  AI_URL=http://host.docker.internal:8001/api  (docker-compose.yml)
 *  - Local bare:    AI_URL=http://localhost:8001/api             (.env.local)
 *  - Production:    AI_URL=http://3.1.140.150:8001/api           (Vercel env var)
 */

export const FALLBACK_URLS = [
  'http://host.docker.internal:8001/api',
  'http://localhost:8001/api',
];

export function resolveAiUrl(): string {
  const url = process.env.AI_URL;

  if (url) return url;

  // AI_URL không được set — chỉ xảy ra khi chạy bare local không có .env.local
  // Không probe (tránh intermittent 502 khi hot-reload), trả về fallback cứng
  if (process.env.NODE_ENV === 'production') {
    console.error('[ai-proxy] FATAL: AI_URL is not set. Set it in Vercel environment variables.');
  } else {
    console.warn('[ai-proxy] AI_URL not set — using fallback http://host.docker.internal:8001/api');
  }

  return FALLBACK_URLS[0];
}
