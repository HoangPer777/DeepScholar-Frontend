/**
 * Static contract checks for the Deep Research live progress integration.
 *
 * These checks intentionally avoid importing TypeScript or rendering React so
 * they can run in the repository's existing lightweight test setup.
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, testName, counterexample) {
  if (condition) {
    console.log(`  PASS: ${testName}`);
    passed += 1;
  } else {
    console.error(`  FAIL: ${testName}`);
    console.error(`    Counterexample: ${counterexample}`);
    failed += 1;
    failures.push({ testName, counterexample });
  }
}

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

const researchSource = read('services/research.ts');
const pageSource = read('app/deep-research/page.tsx');
const resultsSource = read('components/deep-research/ResearchResults.tsx');
const progressSource = read('components/deep-research/ResearchProgress.tsx');

console.log('\n=== Deep Research progress service contract ===');
[
  "export type ResearchPhase",
  "export interface ResearchProgress",
  "export interface ResearchActivity",
  "export interface ResearchSourcePreview",
  "export interface DeepResearchPendingResponse",
  'onProgress?: (snapshot: DeepResearchPendingResponse) => void',
  'onProgress?.(data)',
  "fetch(pollUrl, { cache: 'no-store', signal })",
].forEach((fragment) => {
  assert(
    researchSource.includes(fragment),
    `research.ts contains ${fragment}`,
    `Missing fragment: ${fragment}`,
  );
});

assert(
  researchSource.includes("const INITIAL_INTERVAL_MS = 3000;")
    && researchSource.includes("const MAX_INTERVAL_MS = 8000;"),
  'adaptive polling intervals are preserved',
  'Expected 3 second initial and 8 second maximum intervals',
);
assert(
  researchSource.includes('const maxWaitMs = 20 * 60 * 1000;'),
  '20 minute research timeout is preserved',
  'Research timeout changed unexpectedly',
);

console.log('\n=== Deep Research page state contract ===');
[
  'progress: ResearchProgress | null;',
  'activities: ResearchActivity[];',
  'sourcePreviews: ResearchSourcePreview[];',
  'onProgress: (snapshot) => {',
  'mergeActivities(turn.activities, snapshot.activities)',
  'mergeSourcePreviews(turn.sourcePreviews, snapshot.source_previews)',
].forEach((fragment) => {
  assert(
    pageSource.includes(fragment),
    `page.tsx contains ${fragment}`,
    `Missing fragment: ${fragment}`,
  );
});
assert(
  pageSource.includes('progress={turn.progress}')
    && pageSource.includes('activities={turn.activities}')
    && pageSource.includes('sourcePreviews={turn.sourcePreviews}'),
  'page.tsx passes progress data to ResearchResults',
  'Progress props are not forwarded',
);

console.log('\n=== ResearchProgress component contract ===');
[
  "'planning'",
  "'searching'",
  "'synthesizing'",
  "'drafting'",
  "'reviewing'",
  "'finalizing'",
  'aria-label="Tiến trình Deep Research"',
  'Kế hoạch tìm kiếm',
  'Nguồn đã tìm thấy',
  'Phản hồi đánh giá gần nhất',
  'Hoạt động gần đây',
  'motion-reduce:',
].forEach((fragment) => {
  assert(
    progressSource.includes(fragment),
    `ResearchProgress.tsx contains ${fragment}`,
    `Missing fragment: ${fragment}`,
  );
});
assert(
  !progressSource.includes('dangerouslySetInnerHTML'),
  'progress activity text is rendered safely',
  'dangerouslySetInnerHTML must not be used for server activity text',
);
assert(
  progressSource.includes('rel="noopener noreferrer"'),
  'source preview links use safe target attributes',
  'Safe link attributes missing',
);
assert(
  progressSource.includes('sourcePreviews.slice(0, 6)'),
  'source previews are bounded in the UI',
  'Source preview list has no visible bound',
);

console.log('\n=== ResearchResults integration contract ===');
[
  "import ResearchProgressView from './ResearchProgress';",
  'progress?: ResearchProgress | null;',
  'activities?: ResearchActivity[];',
  'sourcePreviews?: ResearchSourcePreview[];',
  '<ResearchProgressView',
].forEach((fragment) => {
  assert(
    resultsSource.includes(fragment),
    `ResearchResults.tsx contains ${fragment}`,
    `Missing fragment: ${fragment}`,
  );
});
assert(
  resultsSource.includes("errorType === 'rate_limit'")
    && resultsSource.includes("errorType === 'network'"),
  'existing error states remain in ResearchResults',
  'Existing error handling was removed',
);

console.log('\n=== Summary ===');
console.log(`Passed: ${passed} | Failed: ${failed}`);

if (failures.length > 0) {
  console.error('\nFailures:');
  failures.forEach(({ testName, counterexample }) => {
    console.error(`  ${testName}: ${counterexample}`);
  });
  process.exit(1);
}

console.log('\nAll Deep Research progress contract checks passed.');
