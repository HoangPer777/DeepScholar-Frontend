/**
 * Bug Condition Exploration Test — Upload Trigger 503 Fix
 *
 * Validates: Requirements 1.1, 1.2
 *
 * CRITICAL: This test is EXPECTED TO FAIL on unfixed code.
 * Failure confirms both bugs exist. DO NOT fix the code to make this pass.
 *
 * Bug 1: processUpload() calls api.post('/ai/trigger/', ...) which routes to
 *        /api/proxy/ai/trigger/ → Django 8000 → 503 (Django has no such endpoint).
 *        Fix: use fetch('/api/ai-proxy/pdf/upload', ...) instead.
 *
 * Bug 2: deploy.yml hardcodes BACKEND_API_URL="http://localhost:8000/api/v1".
 *        Inside Docker, localhost resolves to the AI container itself, not Django.
 *        Fix: use ${{ secrets.BACKEND_API_URL }} instead.
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

// ─── Bug 1: Wrong Proxy Route ────────────────────────────────────────────────
console.log('\n=== Bug 1: Wrong Proxy Route (Frontend) ===');

const uploadPagePath = path.join(__dirname, '../app/upload/page.tsx');
const uploadPageSource = fs.readFileSync(uploadPagePath, 'utf8');

// The buggy call: api.post('/ai/trigger/', ...) routes through /api/proxy → Django
const hasBuggyApiCall = /api\.post\(\s*['"`]\/ai\/trigger\/['"`]/.test(uploadPageSource);

// The correct call: fetch('/api/ai-proxy/pdf/upload', ...) routes to AI service
const hasCorrectFetchCall = /fetch\(\s*['"`]\/api\/ai-proxy\/pdf\/upload['"`]/.test(uploadPageSource);

assert(
  !hasBuggyApiCall,
  'processUpload() should NOT call api.post(\'/ai/trigger/\', ...) — this routes to Django via /api/proxy and causes 503',
  hasBuggyApiCall
    ? 'FOUND: api.post(\'/ai/trigger/\', ...) in upload/page.tsx → routes to /api/proxy/ai/trigger/ → Django 8000 → 503 Service Unavailable'
    : 'Not found'
);

assert(
  hasCorrectFetchCall,
  'processUpload() SHOULD call fetch(\'/api/ai-proxy/pdf/upload\', ...) — this routes correctly to AI service port 8001',
  !hasCorrectFetchCall
    ? 'NOT FOUND: fetch(\'/api/ai-proxy/pdf/upload\', ...) is missing from upload/page.tsx — the correct route to AI service is not used'
    : 'Found'
);

// ─── Bug 2: Hardcoded localhost in deploy.yml ────────────────────────────────
console.log('\n=== Bug 2: Hardcoded localhost in deploy.yml (AI Service Deploy) ===');

const deployYmlPath = path.join(__dirname, '../../DeepScholar-AIService/.github/workflows/deploy.yml');
const deployYmlSource = fs.readFileSync(deployYmlPath, 'utf8');

// The buggy line: -e BACKEND_API_URL="http://localhost:8000/api/v1"
const hasHardcodedLocalhost = /BACKEND_API_URL=["']?http:\/\/localhost:8000/.test(deployYmlSource);

// The correct form: uses a GitHub secret
const usesSecret = /BACKEND_API_URL="\$\{\{.*secrets\.BACKEND_API_URL.*\}\}"/.test(deployYmlSource);

assert(
  !hasHardcodedLocalhost,
  'deploy.yml BACKEND_API_URL should NOT contain hardcoded localhost:8000 — localhost inside Docker container resolves to the AI container itself, not Django',
  hasHardcodedLocalhost
    ? 'FOUND: BACKEND_API_URL="http://localhost:8000/api/v1" hardcoded in deploy.yml → inside Docker, localhost ≠ Django container → connection refused when AI service tries to PATCH results back'
    : 'Not found'
);

assert(
  usesSecret,
  'deploy.yml BACKEND_API_URL SHOULD use ${{ secrets.BACKEND_API_URL }} — allows configuring the correct host IP or Docker bridge gateway',
  !usesSecret
    ? 'NOT FOUND: ${{ secrets.BACKEND_API_URL }} is not used — no way to configure a resolvable Docker network address'
    : 'Found'
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
  console.log('\n[EXPECTED] Test suite FAILED — this confirms both bugs exist in the unfixed code.');
  console.log('  Bug 1: api.post(\'/ai/trigger/\', ...) → /api/proxy/ai/trigger/ → Django 8000 → 503');
  console.log('  Bug 2: BACKEND_API_URL="http://localhost:8000/api/v1" → connection refused inside Docker');
  process.exit(1);
} else {
  console.log('\n[PASS] All assertions passed — bugs have been fixed.');
  process.exit(0);
}
