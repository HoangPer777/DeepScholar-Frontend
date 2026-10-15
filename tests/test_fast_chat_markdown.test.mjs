import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const component = fs.readFileSync(
  path.join(here, '../components/deep-research/FastChatMarkdown.tsx'),
  'utf8',
);
const page = fs.readFileSync(path.join(here, '../app/deep-research/page.tsx'), 'utf8');

assert.match(component, /import ReactMarkdown/);
assert.match(component, /skipHtml/);
assert.match(component, /urlTransform=\{safeMarkdownUrl\}/);
assert.match(component, /parsed\.protocol === 'http:' \|\| parsed\.protocol === 'https:'/);
assert.match(component, /rel="noopener noreferrer nofollow"/);
assert.match(component, /strong: \(\{ children \}\)/);
assert.match(component, /em: \(\{ children \}\)/);
assert.match(component, /list-disc/);
assert.match(component, /list-decimal/);
assert.match(component, /font-mono/);
assert.doesNotMatch(component, /rehypeRaw|dangerouslySetInnerHTML/);

assert.match(page, /<FastChatMarkdown content=\{turn\.data\.answer\} \/>/);
assert.match(page, /FastChatAgent · Fast Reply/);
assert.match(page, /This research draft was not accepted by the reviewer\./);

console.log('Fast Chat Markdown safety and rendering contract passed.');
