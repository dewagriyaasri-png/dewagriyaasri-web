import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import worker from './worker.mjs';

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.txt': 'text/plain',
  '.xml': 'text/xml',
  '.svg': 'image/svg+xml',
  '.css': 'text/css',
  '.webp': 'image/webp'
};

// Tiruan binding env.ASSETS: melayani file dari public/ seperti Workers Static Assets.
const env = {
  ASSETS: {
    async fetch(request) {
      const { pathname } = new URL(request.url);
      const filePath = path.normalize(path.join(publicDir, decodeURIComponent(pathname)));
      if (!filePath.startsWith(publicDir + path.sep)) return new Response('Not Found', { status: 404 });
      try {
        const body = await readFile(filePath);
        const type = types[path.extname(filePath)] || 'application/octet-stream';
        return new Response(body, { status: 200, headers: { 'Content-Type': type } });
      } catch {
        return new Response('Not Found', { status: 404 });
      }
    }
  }
};

function request(pathname, init = {}) {
  return worker.fetch(new Request(`https://dewagriyaasri.com${pathname}`, init), env);
}

function assertSecurityHeaders(response) {
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.match(response.headers.get('content-security-policy'), /default-src 'self'/);
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.match(response.headers.get('permissions-policy'), /camera=\(\)/);
}

test('/ serves index.html with 200 and security headers', async () => {
  const response = await request('/');
  const body = await response.text();
  const indexHtml = await readFile(path.join(publicDir, 'index.html'), 'utf8');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/html; charset=UTF-8');
  assertSecurityHeaders(response);
  assert.equal(body, indexHtml);
  assert.match(body, /PT Dewa Griya Asri/);
});

test('HEAD / returns 200 without a body', async () => {
  const response = await request('/', { method: 'HEAD' });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
});

test('/index.html redirects permanently to /', async () => {
  const response = await request('/index.html');
  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://dewagriyaasri.com/');
});

test('/robots.txt is served as plain text', async () => {
  const response = await request('/robots.txt');
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/plain; charset=UTF-8');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(body, /Sitemap: https:\/\/dewagriyaasri\.com\/sitemap\.xml/);
});

test('/sitemap.xml is served as XML', async () => {
  const response = await request('/sitemap.xml');
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/xml; charset=UTF-8');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(body, /<urlset/);
});

test('/llms.txt is served as plain text', async () => {
  const response = await request('/llms.txt');
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/plain; charset=UTF-8');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(body, /^# PT Dewa Griya Asri/);
});

test('/favicon.svg is served as SVG', async () => {
  const response = await request('/favicon.svg');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/svg+xml');
});

test('directory paths serve their index.html with security headers', async () => {
  const response = await request('/perumahan/dewa-griya-raja-raja/');
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/html/);
  assertSecurityHeaders(response);
  assert.match(body, /Dewa Griya Raja-Raja/);
});

test('unknown paths return 404 plain text', async () => {
  for (const pathname of ['/not-found', '/tidak-ada/', '/privacy-en']) {
    const response = await request(pathname);
    assert.equal(response.status, 404, pathname);
    assert.equal(response.headers.get('content-type'), 'text/plain; charset=UTF-8');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  }
});
