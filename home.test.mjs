import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile('./public/index.html', 'utf8');
test('homepage has DGA SEO essentials and reference-like sections', () => {
  assert.match(html, /<title>PT Dewa Griya Asri/);
  assert.match(html, /meta name="description"/);
  assert.match(html, /rel="canonical" href="https:\/\/dewagriyaasri\.com\//);
  assert.match(html, /property="og:title"/);
  assert.match(html, /name="twitter:card"/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /rel="icon" href="\/favicon\.svg"/);
  for (const section of ['beranda','layanan','tentang','perumahan','legalitas','kontak']) assert.ok(html.includes(`id="${section}"`), `missing ${section}`);
  assert.match(html, /@media\(max-width:640px\)/);
  assert.match(html, /overflow-x:hidden/);
});
test('project catalog contains supplied verified project data', () => {
  assert.match(html, /Hj\. Ria Efendy/);
  assert.match(html, /director-hj-ria-efendy\.webp/);
  assert.match(html, /Dewa Griya Raja-Raja/);
  assert.match(html, /Arizka Taeng Residen/);
  assert.match(html, /Dewa Griya Mata Allo/);
  assert.match(html, /dewa-griya-raja-raja\.webp/);
  assert.match(html, /arizka-taeng-residen\.webp/);
  assert.match(html, /dewa-griya-mata-allo\.webp/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /v7zaQBCbqoZ4ijrNA/);
  assert.match(html, /xgnjQ3XS2tucTbyp7/);
  assert.match(html, /Angsuran KPR \(estimasi\)/);
  assert.doesNotMatch(html, /Informasi proyek sedang disiapkan/);
});
