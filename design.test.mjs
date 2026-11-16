import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile('../dewagriyaasri-privacy-en.html', 'utf8');

test('uses a compact privacy-policy structure without a long table of contents', () => {
  assert.doesNotMatch(html, /class="toc"/);
  const sectionCount = (html.match(/<h2>/g) || []).length;
  assert.ok(sectionCount >= 6 && sectionCount <= 8, `expected 6-8 sections, found ${sectionCount}`);
});

test('has a simple branded top bar and responsive mobile styles', () => {
  assert.match(html, /class="topbar"/);
  assert.match(html, /@media \(max-width: 640px\)/);
  assert.match(html, /overflow-wrap:\s*anywhere/);
});
