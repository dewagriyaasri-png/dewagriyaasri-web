import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const site = 'https://dewagriyaasri.com';
const pages = {
  '/legalitas/': /<title>[^<]*Legalitas[^<]*<\/title>/i,
  '/artikel/total-biaya-beli-rumah-subsidi-gowa-2026/': /<title>[^<]*Total Biaya[^<]*Rumah Subsidi[^<]*Gowa[^<]*2026[^<]*<\/title>/i,
  '/artikel/gaji-4-juta-bisa-kpr-subsidi/': /<title>[^<]*Gaji (?:Rp ?)?4 Juta[^<]*KPR Subsidi[^<]*<\/title>/i,
  '/artikel/air-pdam-atau-sumur-bor-perumahan-gowa/': /<title>[^<]*Air PDAM[^<]*Sumur Bor[^<]*<\/title>/i
};

function ldJsonBlocks(html) {
  return [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

for (const [urlPath, titlePattern] of Object.entries(pages)) {
  test(`${urlPath} exists with title, canonical and valid JSON-LD`, async () => {
    const html = await readFile(`./public${urlPath}index.html`, 'utf8');
    assert.match(html, titlePattern);
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/);
    assert.ok(canonical, 'missing canonical link');
    assert.equal(canonical[1], `${site}${urlPath}`);
    const blocks = ldJsonBlocks(html);
    assert.ok(blocks.length > 0, 'missing application/ld+json');
    for (const block of blocks) assert.doesNotThrow(() => JSON.parse(block), 'invalid JSON-LD');
    assert.match(html, /<link rel="stylesheet" href="\/project\.css">/);
  });
}

test('sitemap lists /legalitas/ and the new articles with lastmod', async () => {
  const sitemap = await readFile('./public/sitemap.xml', 'utf8');
  for (const urlPath of Object.keys(pages)) {
    assert.match(sitemap, new RegExp(`<loc>${site}${urlPath}</loc><lastmod>2026-11-16</lastmod>`), urlPath);
  }
});
