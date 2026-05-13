/**
 * Shared helpers for ai-proxy route.
 * Extracted for testability.
 */

const CONFIGURED_AI_URL = process.env.AI_URL;

export const FALLBACK_URLS = [
  'http://host.docker.internal:8001/api',
  'http://localhost:8001/api',
];

/**
 * Resolve AI service base URL.
 *
 * Priority:
 * 1. AI_URL env var (explicit config)
 * 2. host.docker.internal:8001 (Docker container environment)
 * 3. localhost:8001 (bare local dev)
 *
 * Detection uses a quick /health probe with 2s timeout.
 * If AI_URL is set, detection is skipped entirely.
 */
export async function resolveAiUrl(): Promise<string> {
  if (CONFIGURED_AI_URL) return CONFIGURED_AI_URL;

  for (const url of FALLBACK_URLS) {
    try {
      const res = await fetch(`${url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok || res.status < 500) {
        return url;
      }
    } catch {
      // Not reachable, try next
    }
  }

  return FALLBACK_URLS[0];
}
