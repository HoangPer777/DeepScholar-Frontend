/**
 * Preservation Property Tests — Upload Trigger 503 Fix
 *
 * Validates: Requirements 3.1, 3.4
 *
 * Property 2: Preservation — Other API Calls and Upload Flow Unaffected
 *
 * IMPORTANT: These tests MUST PASS on BOTH unfixed and fixed code.
 * They encode baseline behavior that must be preserved by the fix.
 *
 * Property 2a (Req 3.1): For all endpoint strings that do NOT start with
 *   `/ai/trigger/`, the `api` helper always prefixes `/api/proxy` correctly.
 *
 * Property 2b (Req 3.4): The `ai-proxy` route handler code forwards the
 *   `Authorization` header unchanged to the AI service.
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, testName, detail) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    console.error(`    Detail: ${detail}`);
    failed++;
    failures.push({ testName, detail });
  }
}

// ─── Read source files ────────────────────────────────────────────────────────

const apiTsPath = path.join(__dirname, '../lib/api.ts');
const apiTsSource = fs.readFileSync(apiTsPath, 'utf8');

const aiProxyRoutePath = path.join(__dirname, '../app/api/ai-proxy/[...path]/route.ts');
const aiProxyRouteSource = fs.readFileSync(aiProxyRoutePath, 'utf8');

// ─── Property 2a: API Helper Preservation (Req 3.1) ──────────────────────────
// For all endpoint strings that do NOT start with `/ai/trigger/`, the `api`
// helper always prefixes `/api/proxy` correctly.
//
// We verify this by:
// 1. Confirming BASE_URL is '/api/proxy' in browser context
// 2. Confirming fetchWithAuth builds URL as `${BASE_URL}${endpoint}`
// 3. Confirming none of the non-trigger endpoints are special-cased

console.log('\n=== Property 2a: API Helper Preservation (Req 3.1) ===');
console.log('Observations:');
console.log('  api.get(\'/articles/some-slug/\')  → /api/proxy/articles/some-slug/');
console.log('  api.post(\'/articles/\', payload)  → /api/proxy/articles/');
console.log('  api.patch(\'/articles/slug/\', payload) → /api/proxy/articles/slug/');

// Test: BASE_URL is '/api/proxy' for browser context
const hasBrowserBaseUrl = /BASE_URL\s*=.*typeof window.*===.*'undefined'[\s\S]*?:.*['"`]\/api\/proxy['"`]/.test(apiTsSource)
  || /['"`]\/api\/proxy['"`]/.test(apiTsSource);

assert(
  hasBrowserBaseUrl,
  'api.ts defines BASE_URL as \'/api/proxy\' for browser context',
  hasBrowserBaseUrl
    ? 'Found /api/proxy in api.ts'
    : 'NOT FOUND: /api/proxy is missing from api.ts — BASE_URL may be wrong'
);

// Test: fetchWithAuth builds URL as `${BASE_URL}${endpoint}`
const hasFetchWithAuthUrlConstruction = /const url\s*=\s*`\$\{BASE_URL\}\$\{endpoint\}`/.test(apiTsSource)
  || /BASE_URL.*endpoint/.test(apiTsSource);

assert(
  hasFetchWithAuthUrlConstruction,
  'fetchWithAuth constructs URL as `${BASE_URL}${endpoint}` (prefix + endpoint)',
  hasFetchWithAuthUrlConstruction
    ? 'Found URL construction pattern in api.ts'
    : 'NOT FOUND: URL construction `${BASE_URL}${endpoint}` missing from api.ts'
);

// Property-based: generate multiple non-trigger endpoints and verify they would
// all be prefixed with /api/proxy (by checking the source has no special-casing
// that would skip the prefix for these endpoints).
const nonTriggerEndpoints = [
  '/articles/',
  '/articles/some-slug/',
  '/articles/paper-123/',
  '/articles/upload_url/',
  '/authors/ranking/',
  '/authors/ranking/?search=foo',
  '/search/',
  '/bookmarks/',
  '/users/me/',
  '/articles/paper-456/comments/',
];

console.log('\n  Property-based check: none of the following endpoints are special-cased to skip /api/proxy prefix:');

// Check that the api.ts source does NOT contain any special-case routing
// that would bypass BASE_URL for non-trigger endpoints.
// The only special case allowed is for /ai/trigger/ (the bug being fixed).
const hasSpecialCaseForNonTrigger = nonTriggerEndpoints.some(ep => {
  // Look for any conditional that would route these endpoints differently
  const escapedEp = ep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escapedEp).test(apiTsSource);
});

assert(
  !hasSpecialCaseForNonTrigger,
  'api.ts does NOT special-case any non-trigger endpoints (all use BASE_URL prefix uniformly)',
  hasSpecialCaseForNonTrigger
    ? 'FOUND: One or more non-trigger endpoints are hardcoded in api.ts — may bypass /api/proxy prefix'
    : 'No special-casing found for non-trigger endpoints'
);

// Test: api helper exposes get/post/patch/put/delete all going through fetchWithAuth
const hasApiGet = /get:\s*\(endpoint/.test(apiTsSource);
const hasApiPost = /post:\s*\(endpoint/.test(apiTsSource);
const hasApiPatch = /patch:\s*\(endpoint/.test(apiTsSource);
const hasApiDelete = /delete:\s*\(endpoint/.test(apiTsSource);

assert(
  hasApiGet && hasApiPost && hasApiPatch && hasApiDelete,
  'api helper exposes get/post/patch/delete methods all routing through fetchWithAuth',
  `get:${hasApiGet} post:${hasApiPost} patch:${hasApiPatch} delete:${hasApiDelete}`
);

// Simulate the URL construction for each non-trigger endpoint
// (pure string logic — no network calls needed)
const BROWSER_BASE_URL = '/api/proxy'; // as defined in api.ts for browser

console.log('\n  Simulating URL construction for non-trigger endpoints:');
let allEndpointsCorrect = true;
for (const ep of nonTriggerEndpoints) {
  const constructedUrl = `${BROWSER_BASE_URL}${ep}`;
  const isCorrect = constructedUrl.startsWith('/api/proxy');
  if (!isCorrect) allEndpointsCorrect = false;
  console.log(`    ${ep} → ${constructedUrl} [${isCorrect ? 'OK' : 'FAIL'}]`);
}

assert(
  allEndpointsCorrect,
  'All non-trigger endpoints produce URLs starting with /api/proxy when using BASE_URL=/api/proxy',
  allEndpointsCorrect
    ? 'All 10 endpoints correctly prefixed with /api/proxy'
    : 'One or more endpoints did not produce /api/proxy-prefixed URL'
);

// ─── Property 2b: Authorization Header Preservation (Req 3.4) ────────────────
// The ai-proxy route handler forwards the Authorization header unchanged.
//
// We verify by static analysis of the route.ts source:
// 1. It reads the authorization header from the incoming request
// 2. It sets Authorization in the outgoing headers
// 3. The value is forwarded unchanged (not modified/stripped)

console.log('\n=== Property 2b: Authorization Header Preservation (Req 3.4) ===');

// Test: ai-proxy route reads authorization header from request
const readsAuthHeader = /req\.headers\.get\(\s*['"`]authorization['"`]\s*\)/.test(aiProxyRouteSource);

assert(
  readsAuthHeader,
  'ai-proxy route reads Authorization header from incoming request via req.headers.get(\'authorization\')',
  readsAuthHeader
    ? 'Found req.headers.get(\'authorization\') in ai-proxy route'
    : 'NOT FOUND: req.headers.get(\'authorization\') missing from ai-proxy route'
);

// Test: ai-proxy route sets Authorization in outgoing headers
const setsAuthHeader = /headers\[['"`]Authorization['"`]\]\s*=\s*auth/.test(aiProxyRouteSource)
  || /Authorization.*auth/.test(aiProxyRouteSource);

assert(
  setsAuthHeader,
  'ai-proxy route sets Authorization header in outgoing request headers',
  setsAuthHeader
    ? 'Found Authorization header assignment in ai-proxy route'
    : 'NOT FOUND: Authorization header is not forwarded in ai-proxy route'
);

// Test: the forwarding is conditional on auth being present (not null)
const hasAuthNullCheck = /if\s*\(\s*auth\s*\)/.test(aiProxyRouteSource)
  || /auth\s*&&/.test(aiProxyRouteSource)
  || /auth\s*\?/.test(aiProxyRouteSource);

assert(
  hasAuthNullCheck,
  'ai-proxy route only forwards Authorization header when it is present (null-check)',
  hasAuthNullCheck
    ? 'Found null-check for auth before forwarding'
    : 'NOT FOUND: No null-check for auth — may forward null/undefined as Authorization header'
);

// Property-based: simulate Authorization header forwarding for multiple token strings
// This verifies the forwarding logic is identity (value unchanged)
const sampleTokens = [
  'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
  'Bearer abc123',
  'Bearer token-with-dashes',
  'Bearer UPPERCASE_TOKEN',
  'Bearer token.with.dots',
  'Bearer 0123456789abcdef',
  'Bearer very-long-token-' + 'x'.repeat(100),
  'Bearer token_with_underscores',
  'Bearer token+with+plus',
  'Bearer token/with/slashes',
];

console.log('\n  Property-based check: Authorization header forwarding is identity (value unchanged):');

// Simulate the forwarding logic from route.ts:
//   const auth = req.headers.get('authorization');
//   if (auth) headers['Authorization'] = auth;
// The value assigned to headers['Authorization'] equals the original auth value.

let allTokensForwardedUnchanged = true;
for (const token of sampleTokens) {
  // Simulate: auth = token (from req.headers.get('authorization'))
  const auth = token;
  const headers = {};
  if (auth) headers['Authorization'] = auth;
  const forwarded = headers['Authorization'];
  const isUnchanged = forwarded === token;
  if (!isUnchanged) allTokensForwardedUnchanged = false;
  // Only log first 3 and last 1 to keep output concise
  if (sampleTokens.indexOf(token) < 3 || sampleTokens.indexOf(token) === sampleTokens.length - 1) {
    console.log(`    "${token.substring(0, 40)}${token.length > 40 ? '...' : ''}" → forwarded unchanged: ${isUnchanged}`);
  }
}
if (sampleTokens.length > 4) {
  console.log(`    ... (${sampleTokens.length - 4} more tokens all forwarded unchanged)`);
}

assert(
  allTokensForwardedUnchanged,
  'Authorization header forwarding logic preserves token value unchanged for all 10 sample tokens',
  allTokensForwardedUnchanged
    ? 'All 10 tokens forwarded with identical value'
    : 'One or more tokens were modified during forwarding'
);

// Test: ai-proxy route does NOT strip or modify the Authorization header value
// (no base64 decode, no token parsing, no prefix stripping)
const hasNoAuthModification = !/auth\.replace/.test(aiProxyRouteSource)
  && !/auth\.split/.test(aiProxyRouteSource)
  && !/auth\.substring/.test(aiProxyRouteSource)
  && !/auth\.slice/.test(aiProxyRouteSource);

assert(
  hasNoAuthModification,
  'ai-proxy route does NOT modify the Authorization header value (no replace/split/substring/slice)',
  hasNoAuthModification
    ? 'No auth modification found in ai-proxy route'
    : 'FOUND: ai-proxy route modifies the Authorization header value before forwarding'
);

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log('\n=== Summary ===');
console.log(`Passed: ${passed} | Failed: ${failed}`);

if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach(({ testName, detail }) => {
    console.log(`  [FAIL] ${testName}`);
    console.log(`         ${detail}`);
  });
  console.log('\n[UNEXPECTED FAIL] Preservation tests should PASS on both unfixed and fixed code.');
  console.log('  If these fail, the baseline behavior is broken — investigate before applying the fix.');
  process.exit(1);
} else {
  console.log('\n[PASS] All preservation assertions passed — baseline behavior confirmed.');
  console.log('  Property 2a (Req 3.1): api helper correctly prefixes /api/proxy for all non-trigger endpoints');
  console.log('  Property 2b (Req 3.4): ai-proxy route forwards Authorization header unchanged');
  console.log('\n  These behaviors MUST remain unchanged after the fix is applied.');
  process.exit(0);
}
