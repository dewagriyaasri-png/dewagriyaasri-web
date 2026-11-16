import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const pages = {
  'perumahan-gowa': ['Perumahan di Gowa','Kabupaten Gowa'],
  'perumahan-pallangga': ['Perumahan Pallangga','Pallangga'],
  'perumahan-taeng': ['Perumahan Taeng','Taeng']
};
for (const [slug, [title, keyword]] of Object.entries(pages)) {
  test(`${title} location page has unique SEO content`, async () => {
    const html = await readFile(`./public/${slug}/index.html`, 'utf8');
    assert.match(html, new RegExp(`<title>${title}`));
    assert.match(html, /rel="canonical"/);
    assert.match(html, /application\/ld\+json/);
    assert.match(html, new RegExp(keyword));
    assert.match(html, /Tanya via WhatsApp/);
  });
}
const sitemap = await readFile('./public/sitemap.xml', 'utf8');
test('sitemap includes location pages', () => {
  for (const slug of Object.keys(pages)) assert.match(sitemap, new RegExp(slug));
});
