/**
 * Tests for ai-proxy route URL resolution logic.
 *
 * Run: npx jest tests/test_ai_proxy_route.test.js
 */

// Mock global fetch
global.fetch = jest.fn();

// Helper to reset modules between tests so env vars take effect
function resetModules() {
  jest.resetModules();
  jest.clearAllMocks();
}

describe('ai-proxy: URL resolution', () => {
  afterEach(() => {
    resetModules();
    delete process.env.AI_URL;
  });

  test('uses AI_URL env var when set — no health check needed', async () => {
    process.env.AI_URL = 'http://custom-ai-host:9000/api';

    let resolveAiUrl;
    jest.isolateModules(() => {
      ({ resolveAiUrl } = require('../app/api/ai-proxy/[...path]/route-helpers'));
    });
    const url = await resolveAiUrl();

    expect(url).toBe('http://custom-ai-host:9000/api');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('falls back to host.docker.internal when it responds', async () => {
    delete process.env.AI_URL;

    global.fetch.mockImplementation((url) => {
      if (url.includes('host.docker.internal')) {
        return Promise.resolve({ ok: true, status: 200 });
      }
      return Promise.reject(new Error('Connection refused'));
    });

    let resolveAiUrl;
    jest.isolateModules(() => {
      ({ resolveAiUrl } = require('../app/api/ai-proxy/[...path]/route-helpers'));
    });
    const url = await resolveAiUrl();

    expect(url).toBe('http://host.docker.internal:8001/api');
  });

  test('falls back to localhost when host.docker.internal fails', async () => {
    delete process.env.AI_URL;

    global.fetch.mockImplementation((url) => {
      if (url.includes('localhost')) {
        return Promise.resolve({ ok: true, status: 200 });
      }
      return Promise.reject(new Error('Connection refused'));
    });

    let resolveAiUrl;
    jest.isolateModules(() => {
      ({ resolveAiUrl } = require('../app/api/ai-proxy/[...path]/route-helpers'));
    });
    const url = await resolveAiUrl();

    expect(url).toBe('http://localhost:8001/api');
  });

  test('returns first candidate when all health checks fail', async () => {
    delete process.env.AI_URL;

    global.fetch.mockRejectedValue(new Error('All down'));

    let resolveAiUrl;
    jest.isolateModules(() => {
      ({ resolveAiUrl } = require('../app/api/ai-proxy/[...path]/route-helpers'));
    });
    const url = await resolveAiUrl();

    // Should return first fallback, not throw
    expect(url).toBe('http://host.docker.internal:8001/api');
  });
});
