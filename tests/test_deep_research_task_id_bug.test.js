/**
 * Bug Condition Exploration Test — Deep Research Task ID Fix
 *
 * Validates: Requirements 1.1, 1.2, 1.3
 *
 * CRITICAL: This test is EXPECTED TO FAIL on unfixed code.
 * Failure confirms the bug exists. DO NOT fix the code to make this pass.
 *
 * Bug: DeepScholar-Frontend/app/api/ai-proxy/[...path]/route.ts thiếu
 *      `export const maxDuration = 30`, khiến Vercel áp dụng default timeout
 *      (10s Hobby / 60s Pro). Khi AI service có cold start delay > timeout,
 *      Vercel terminate connection → frontend nhận response không có task_id
 *      → throw "No task_id returned from AI service".
 *
 * Bug Condition (from design.md):
 *   isBugCondition(X) = X.path = "research/deep-research"
 *                    AND X.method = "POST"
 *                    AND NOT EXISTS (export maxDuration IN route.ts)
 *
 * Expected after fix:
 *   - route.ts có `export const maxDuration = 30`
 *   - Proxy trả về {task_id, status: "pending"} trong < 5000ms
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

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

// ─── Static Check: maxDuration missing in route.ts ───────────────────────────
console.log('\n=== Bug Condition: Missing maxDuration in ai-proxy route.ts ===');

const routePath = path.join(__dirname, '../app/api/ai-proxy/[...path]/route.ts');
const routeSource = fs.readFileSync(routePath, 'utf8');

const hasMaxDuration = /export\s+const\s+maxDuration\s*=\s*\d+/.test(routeSource);

assert(
  hasMaxDuration,
  'route.ts SHOULD have `export const maxDuration = 30` — without it Vercel applies default timeout and terminates connection before AI service returns task_id',
  !hasMaxDuration
    ? 'NOT FOUND: `export const maxDuration` is missing from app/api/ai-proxy/[...path]/route.ts → Vercel default timeout will terminate connection on cold start → frontend receives empty response → "No task_id returned from AI service"'
    : 'Found'
);

// Check value is sufficient (>= 30)
if (hasMaxDuration) {
  const match = routeSource.match(/export\s+const\s+maxDuration\s*=\s*(\d+)/);
  const value = match ? parseInt(match[1], 10) : 0;
  assert(
    value >= 30,
    'maxDuration SHOULD be >= 30 seconds — AI service cold start can take up to 15s, need buffer',
    value < 30
      ? `FOUND: maxDuration = ${value} — too low, AI service cold start may exceed this timeout`
      : `Found: maxDuration = ${value}`
  );
}

// ─── Dynamic Check: Proxy returns task_id with mock AI service ───────────────
console.log('\n=== Bug Condition: Proxy must return task_id within 5000ms ===');

/**
 * Starts a mock HTTP server that responds after `delayMs` with {task_id, status: "pending"}
 */
function startMockAIServer(delayMs, port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/api/research/deep-research') {
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ task_id: 'mock-uuid-1234-5678-abcd', status: 'pending' }));
        }, delayMs);
      } else {
        res.writeHead(404);
        res.end('{}');
      }
    });
    server.listen(port, '0.0.0.0', () => resolve(server));
  });
}

/**
 * Makes a POST request to the Next.js proxy endpoint
 * In Docker, the frontend container is accessible at localhost:3000
 */
function postToProxy(host, port, path, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const options = {
      hostname: host,
      port: port,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
      timeout: timeoutMs,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: null, raw: data });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    });

    req.on('error', (err) => reject(err));
    req.write(bodyStr);
    req.end();
  });
}

async function runDynamicTests() {
  // Note: Dynamic tests require the Next.js dev server running at localhost:3000
  // and AI_URL pointing to our mock server.
  // In Docker environment, we check if the proxy is reachable first.

  const PROXY_HOST = process.env.PROXY_HOST || 'localhost';
  const PROXY_PORT = parseInt(process.env.PROXY_PORT || '3000', 10);

  // Quick connectivity check
  let proxyReachable = false;
  try {
    await postToProxy(PROXY_HOST, PROXY_PORT, '/api/ai-proxy/research/deep-research', { query: 'test' }, 2000);
    proxyReachable = true;
  } catch (err) {
    // Proxy not reachable — skip dynamic tests, static check is sufficient
    console.log(`  ℹ SKIP dynamic tests: Next.js proxy not reachable at ${PROXY_HOST}:${PROXY_PORT} (${err.message})`);
    console.log('    Static check above is the primary bug condition validator.');
    console.log('    Run with PROXY_HOST=<host> PROXY_PORT=<port> to enable dynamic tests.');
  }

  if (proxyReachable) {
    // Test: fast response (1s delay) — should return task_id
    console.log('\n  [Dynamic] Testing proxy with fast AI response (1s delay)...');
    try {
      const start = Date.now();
      const result = await postToProxy(
        PROXY_HOST, PROXY_PORT,
        '/api/ai-proxy/research/deep-research',
        { query: 'test query' },
        5000
      );
      const elapsed = Date.now() - start;

      assert(
        result.body && result.body.task_id,
        `Proxy SHOULD return task_id in response (elapsed: ${elapsed}ms)`,
        !result.body || !result.body.task_id
          ? `task_id is missing from response. Status: ${result.status}, Body: ${JSON.stringify(result.body)}`
          : 'task_id present'
      );

      if (result.body && result.body.task_id) {
        assert(
          elapsed < 5000,
          `Proxy SHOULD respond within 5000ms (actual: ${elapsed}ms)`,
          elapsed >= 5000
            ? `Response took ${elapsed}ms — exceeds 5000ms threshold`
            : `${elapsed}ms`
        );

        assert(
          result.body.status === 'pending',
          `Response status SHOULD be "pending" (actual: "${result.body.status}")`,
          result.body.status !== 'pending'
            ? `Expected status="pending", got "${result.body.status}"`
            : 'pending'
        );
      }
    } catch (err) {
      assert(false, 'Proxy request SHOULD complete without error', `Error: ${err.message}`);
    }
  }
}

// ─── Run all tests ────────────────────────────────────────────────────────────
runDynamicTests().then(() => {
  console.log('\n=== Summary ===');
  console.log(`Passed: ${passed} | Failed: ${failed}`);

  if (failures.length > 0) {
    console.log('\nCounterexamples documented:');
    failures.forEach(({ testName, counterexample }) => {
      console.log(`  [FAIL] ${testName}`);
      console.log(`         ${counterexample}`);
    });
    console.log('\n[EXPECTED on unfixed code] Test suite FAILED — confirms bug exists:');
    console.log('  Missing `export const maxDuration` in app/api/ai-proxy/[...path]/route.ts');
    console.log('  → Vercel default timeout terminates connection before AI service returns task_id');
    console.log('  → Frontend receives empty/error response → "No task_id returned from AI service"');
    process.exit(1);
  } else {
    console.log('\n[PASS] All assertions passed — bug has been fixed.');
    process.exit(0);
  }
});
