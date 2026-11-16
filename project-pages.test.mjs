import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const pages = {
  'dewa-griya-raja-raja': ['Dewa Griya Raja-Raja','dewa-griya-raja-raja.webp','v7zaQBCbqoZ4ijrNA'],
  'arizka-taeng-residen': ['Arizka Taeng Residen','arizka-taeng-residen.webp','xgnjQ3XS2tucTbyp7'],
  'dewa-griya-mata-allo': ['Dewa Griya Mata Allo','dewa-griya-mata-allo.webp','bCNLftCjCtgudQwL9']
};
for (const [slug, [name, image, maps]] of Object.entries(pages)) {
  test(`${name} landing page has unique SEO content`, async () => {
    const html = await readFile(`./public/perumahan/${slug}/index.html`, 'utf8');
    assert.match(html, new RegExp(`<title>${name}`));
    assert.match(html, /rel="canonical"/);
    assert.match(html, /application\/ld\+json/);
    assert.match(html, new RegExp(image));
    assert.match(html, new RegExp(maps));
    assert.match(html, /Konsultasi via WhatsApp/);
  });
}
