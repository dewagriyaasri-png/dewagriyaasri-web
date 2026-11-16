import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const pages = {
  'panduan-memilih-rumah-tipe-36-di-gowa': 'Panduan Memilih Rumah Tipe 36 di Gowa',
  'memahami-dp-dan-cicilan-kpr': 'Cara Memahami DP dan Cicilan KPR Rumah',
  'perbedaan-rumah-subsidi-dan-komersial': 'Perbedaan Rumah Subsidi dan Komersial'
};
for (const [slug, title] of Object.entries(pages)) {
  test(`${title} article has SEO structure`, async () => {
    const html = await readFile(`./public/artikel/${slug}/index.html`, 'utf8');
    assert.match(html, new RegExp(`<title>${title}`));
    assert.match(html, /rel="canonical"/);
    assert.match(html, /application\/ld\+json/);
    assert.match(html, /article-page/);
  });
}
const sitemap = await readFile('./public/sitemap.xml', 'utf8');
test('sitemap includes SEO articles', () => {
  for (const slug of Object.keys(pages)) assert.match(sitemap, new RegExp(slug));
});
