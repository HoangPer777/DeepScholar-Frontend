const fs = require('fs');
const path = require('path');

const researchService = fs.readFileSync(path.join(__dirname, '../services/research.ts'), 'utf8');
const researchPage = fs.readFileSync(path.join(__dirname, '../app/deep-research/page.tsx'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(researchService.includes("review_status?: 'accepted' | 'rejected'"), 'Research response exposes reviewer state');
assert(researchService.includes('fast_chat_ready?: boolean'), 'Research response exposes Fast Chat readiness');
assert(researchService.includes('Chat unavailable: ${detail'), '404 errors use the backend detail instead of assuming restart');
assert(researchPage.includes('This research draft was not accepted by the reviewer.'), 'Rejected drafts are explicitly labeled');
assert(researchPage.includes('Fast Chat can still use it as context'), 'UI clarifies that Fast Chat can use rejected drafts');

console.log('Fast Chat unreviewed-context frontend contract passed.');
