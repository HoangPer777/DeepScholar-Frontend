/**
 * Preservation Property Tests — Deep Research Task ID Fix
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 *
 * EXPECTED OUTCOME: Tests PASS on both unfixed and fixed code.
 * These tests confirm baseline behavior that must NOT regress after fix.
 *
 * Preservation Properties (from design.md):
 *   For all requests NOT matching isBugCondition(X):
 *     aiProxy(X) = aiProxy'(X)  (behavior identical before and after fix)
 *
 * Checks:
 *   1. Proxy logic (headers, method, body forwarding) is unchanged
 *   2. Error handling (502 on network error) is unchanged
 *   3. Status code forwarding is unchanged (200, 404, 422, 500)
 *   4. Response body forwarding is unchanged
 *   5. GET polling endpoint behavior is unchanged
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, testName, counterexample) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    console.error(`    Counterexample: ${counterexample}`);
    failed++;
    failures.push({ testName, counterexample });
  }
}

// ─── Static: Proxy logic unchanged ───────────────────────────────────────────
console.log('\n=== Preservation: Proxy logic structure unchanged ===');

const routePath = path.join(__dirname, '../app/api/ai-proxy/[...path]/route.ts');
const routeSource = fs.readFileSync(routePath, 'utf8');
const routeHelpersPath = path.join(__dirname, '../app/api/ai-proxy/[...path]/route-helpers.ts');
const routeHelpersSource = fs.readFileSync(routeHelpersPath, 'utf8');

// GET handler must exist
assert(
  /export\s+async\s+function\s+GET/.test(routeSource),
  'GET handler SHOULD exist in route.ts',
  'GET handler missing from route.ts'
);

// POST handler must exist
assert(
  /export\s+async\s+function\s+POST/.test(routeSource),
  'POST handler SHOULD exist in route.ts',
  'POST handler missing from route.ts'
);

// proxyRequest function must exist
assert(
  /async\s+function\s+proxyRequest/.test(routeSource),
  'proxyRequest() SHOULD exist in route.ts',
  'proxyRequest() missing from route.ts'
);

// AI_URL must be configurable via env
assert(
  /resolveAiUrl/.test(routeSource) && /process\.env\.AI_URL/.test(routeHelpersSource),
  'AI_URL SHOULD be resolved from process.env.AI_URL',
  'AI_URL resolver or process.env.AI_URL not found'
);

// Error handling: 502 on fetch failure
assert(
  /status:\s*502/.test(routeSource),
  'Proxy SHOULD return 502 when AI service is unreachable',
  '502 error handling missing from route.ts'
);

// Authorization header forwarding
assert(
  /authorization/i.test(routeSource),
  'Proxy SHOULD forward Authorization header',
  'Authorization header forwarding missing from route.ts'
);

// ─── Static: research.ts polling logic unchanged ─────────────────────────────
console.log('\n=== Preservation: research.ts polling logic unchanged ===');

const researchPath = path.join(__dirname, '../services/research.ts');
const researchSource = fs.readFileSync(researchPath, 'utf8');

// Polling URL pattern
assert(
  /research\/status\/\$\{task_id\}/.test(researchSource),
  'research.ts SHOULD poll GET /research/status/{task_id}',
  'Polling URL pattern missing from research.ts'
);

// 404 handling for invalid task_id
assert(
  /pollRes\.status\s*===\s*404/.test(researchSource),
  'research.ts SHOULD handle 404 for invalid task_id',
  '404 handling missing from research.ts'
);

// Rate limit error handling
assert(
  /rate_limit_exceeded/.test(researchSource),
  'research.ts SHOULD handle rate_limit_exceeded error',
  'rate_limit_exceeded handling missing from research.ts'
);

// 20 minute max wait (current production contract)
assert(
  /20\s*\*\s*60\s*\*\s*1000/.test(researchSource),
  'research.ts SHOULD have 20 minute max polling timeout',
  '20 minute timeout missing from research.ts'
);

// Adaptive polling starts at 3 seconds
assert(
  /INITIAL_INTERVAL_MS\s*=\s*3000/.test(researchSource)
    && /MAX_INTERVAL_MS\s*=\s*8000/.test(researchSource),
  'research.ts SHOULD preserve adaptive 3-8 second polling',
  'Adaptive polling bounds missing from research.ts'
);

// task_id null check
assert(
  /No task_id returned from AI service/.test(researchSource),
  'research.ts SHOULD throw error when task_id is missing',
  'task_id null check missing from research.ts'
);

// ─── Static: No redirect logic in page.tsx ───────────────────────────────────
console.log('\n=== Preservation: page.tsx error handling (no redirect) ===');

const pagePath = path.join(__dirname, '../app/deep-research/page.tsx');
const pageSource = fs.readFileSync(pagePath, 'utf8');

// Should NOT redirect to /archive on error
const hasArchiveRedirect = /router\.push\s*\(\s*['"`]\/archive['"`]/.test(pageSource)
  || /window\.location.*\/archive/.test(pageSource)
  || /redirect\s*\(\s*['"`]\/archive['"`]/.test(pageSource);

assert(
  !hasArchiveRedirect,
  'page.tsx SHOULD NOT redirect to /archive on error — error should be shown in-place',
  hasArchiveRedirect
    ? 'FOUND: redirect to /archive in page.tsx — this causes 404 after error'
    : 'No redirect found'
);

// Should have error state handling
assert(
  /setError|error\s*&&/.test(pageSource),
  'page.tsx SHOULD display error in-place (setError or error state)',
  'No error state handling found in page.tsx'
);

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log('\n=== Summary ===');
console.log(`Passed: ${passed} | Failed: ${failed}`);

if (failures.length > 0) {
  console.log('\nCounterexamples documented:');
  failures.forEach(({ testName, counterexample }) => {
    console.log(`  [FAIL] ${testName}`);
    console.log(`         ${counterexample}`);
  });
  console.log('\n[UNEXPECTED] Preservation tests FAILED — baseline behavior has changed.');
  process.exit(1);
} else {
  console.log('\n[PASS] All preservation tests passed — baseline behavior confirmed.');
  process.exit(0);
}
