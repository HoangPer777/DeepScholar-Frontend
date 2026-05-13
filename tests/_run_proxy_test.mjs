// Quick logic test for resolveAiUrl
// Usage: node tests/_run_proxy_test.mjs

const FALLBACK_URLS = [
  'http://host.docker.internal:8001/api',
  'http://localhost:8001/api',
];

async function resolveAiUrl(configuredUrl, mockFetch) {
  if (configuredUrl) return configuredUrl;
  for (const url of FALLBACK_URLS) {
    try {
      const res = await mockFetch(url + '/health');
      if (res.ok || res.status < 500) return url;
    } catch {}
  }
  return FALLBACK_URLS[0];
}

let passed = 0;
let failed = 0;

function assert(condition, label, got) {
  if (condition) {
    console.log(`PASS: ${label}`);
    passed++;
  } else {
    console.log(`FAIL: ${label} — got: ${got}`);
    failed++;
  }
}

// T1: AI_URL set -> use directly, no health check
const r1 = await resolveAiUrl('http://custom:9000/api', () => { throw new Error('should not call'); });
assert(r1 === 'http://custom:9000/api', 'T1 uses AI_URL env var directly', r1);

// T2: host.docker.internal responds -> use it
const r2 = await resolveAiUrl(null, (url) => {
  if (url.includes('host.docker.internal')) return Promise.resolve({ ok: true, status: 200 });
  return Promise.reject(new Error('refused'));
});
assert(r2 === 'http://host.docker.internal:8001/api', 'T2 uses host.docker.internal when it responds', r2);

// T3: host.docker.internal fails, localhost responds
const r3 = await resolveAiUrl(null, (url) => {
  if (url.includes('localhost')) return Promise.resolve({ ok: true, status: 200 });
  return Promise.reject(new Error('refused'));
});
assert(r3 === 'http://localhost:8001/api', 'T3 falls back to localhost', r3);

// T4: all fail -> returns first candidate, no throw
const r4 = await resolveAiUrl(null, () => Promise.reject(new Error('all down')));
assert(r4 === 'http://host.docker.internal:8001/api', 'T4 returns first candidate when all fail', r4);

// T5: health check returns 404 (non-5xx) -> still use it
const r5 = await resolveAiUrl(null, (url) => {
  if (url.includes('host.docker.internal')) return Promise.resolve({ ok: false, status: 404 });
  return Promise.reject(new Error('refused'));
});
assert(r5 === 'http://host.docker.internal:8001/api', 'T5 accepts non-5xx status as reachable', r5);

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
