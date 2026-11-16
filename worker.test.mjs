import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';

async function request(path, init = {}) {
  return worker.fetch(new Request(`https://dewagriyaasri.com${path}`, init));
}

test('serves the English privacy policy at /privacy-en', async () => {
  const response = await request('/privacy-en');
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/html/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(body.startsWith('<!doctype html>'), 'response must start with an HTML doctype, not file line numbers');
  assert.doesNotMatch(body, /^\d+\|/m, 'response must not contain read-tool line-number prefixes');
  assert.match(body, /PT Dewa Griya Asri/);
  assert.match(body, /Privacy Policy/);
});

test('accepts a trailing slash on the privacy URL', async () => {
  const response = await request('/privacy-en/');
  assert.equal(response.status, 200);
});

test('redirects the bare domain to the privacy policy', async () => {
  const response = await request('/');
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'https://dewagriyaasri.com/privacy-en');
});

test('returns 404 for unknown paths', async () => {
  const response = await request('/not-found');
  assert.equal(response.status, 404);
});
