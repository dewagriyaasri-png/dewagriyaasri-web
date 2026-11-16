import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const facts = JSON.parse(await readFile('./data/fakta-proyek.json', 'utf8'));

async function listHtml(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await listHtml(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const htmlFiles = await listHtml('./public');
const pages = await Promise.all(htmlFiles.map(async (file) => [file, await readFile(file, 'utf8')]));

// 25000000 -> "Rp25.000.000"
const rupiah = (n) => 'Rp' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

test('public HTML pages exist', () => {
  assert.ok(pages.length > 0);
});

test('no public page contains draft notes', () => {
  const drafts = [/perlu dikonfirmasi/i, /sebelum website dipublikasikan/i, /publikasi final/i];
  for (const [file, html] of pages) {
    for (const pattern of drafts) assert.doesNotMatch(html, pattern, `${file} memuat catatan draf ${pattern}`);
  }
});

test('every application/ld+json block in public HTML is valid JSON', () => {
  for (const [file, html] of pages) {
    const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
    for (const [, json] of blocks) {
      assert.doesNotThrow(() => JSON.parse(json), `${file}: JSON-LD tidak valid`);
    }
  }
});

test('the only phone number on public pages is 0822-2526-7430', () => {
  const allowed = new Set(['082225267430', '6282225267430']);
  // Nomor seluler Indonesia: 08xx atau (+)628xx, boleh dipisah spasi, titik, atau tanda hubung.
  const phonePattern = /(?<![\d])(?:\+?62|0)8\d(?:[\s.-]?\d){7,11}(?![\d])/g;
  for (const [file, html] of pages) {
    assert.doesNotMatch(html, /0856[\s.-]?5652[\s.-]?6994|62856[\s.-]?5652[\s.-]?6994/, `${file} memuat 0856-5652-6994`);
    assert.doesNotMatch(html, /0823[\s.-]?4532[\s.-]?7528|62823[\s.-]?4532[\s.-]?7528/, `${file} memuat 0823-4532-7528`);
    for (const [match] of html.matchAll(phonePattern)) {
      const digits = match.replace(/\D/g, '');
      assert.ok(allowed.has(digits), `${file} memuat nomor lain: ${match}`);
    }
  }
});

for (const project of facts.proyek) {
  test(`${project.nama} page shows the DP from data/fakta-proyek.json`, async () => {
    const html = await readFile(`./public/perumahan/${project.slug}/index.html`, 'utf8');
    assert.ok(Number.isFinite(project.dp), 'dp harus angka di fakta-proyek.json');
    assert.ok(html.includes(rupiah(project.dp)), `${project.slug} tidak memuat DP ${rupiah(project.dp)}`);
  });
}

test('homepage no longer lists a Rp25.000.000 akad fee', async () => {
  const html = await readFile('./public/index.html', 'utf8');
  assert.doesNotMatch(html, /Biaya akad<\/strong><span>Rp25\.000\.000/);
});

test('llms.txt matches data/fakta-proyek.json', async () => {
  const llms = await readFile('./public/llms.txt', 'utf8');
  const company = facts.perusahaan;
  assert.match(llms, /^# PT Dewa Griya Asri\n\n> /);
  assert.ok(llms.includes(company.nib), 'NIB tidak ada');
  assert.ok(llms.includes(company.telepon_tampil), 'nomor telepon tidak ada');
  assert.ok(llms.includes(company.email), 'email tidak ada');
  assert.doesNotMatch(llms, /\[Rp|TBD|null|perlu dikonfirmasi/i);
  const lines = llms.split('\n');
  for (const project of facts.proyek) {
    const line = lines.find((l) => l.includes(`/perumahan/${project.slug}/`) && l.startsWith('- ['));
    assert.ok(line, `${project.slug} tidak punya baris di llms.txt`);
    for (const value of [project.utj, project.dp, ...Object.values(project.cicilan)]) {
      assert.ok(line.includes(rupiah(value)), `${project.slug}: ${rupiah(value)} tidak ada`);
    }
    assert.ok(line.includes(project.tipe) && line.includes(project.listrik) && line.includes(project.maps), project.slug);
    assert.ok(line.includes(project.lokasi), `${project.slug}: lokasi llms.txt tidak sama dengan fakta-proyek.json (${project.lokasi})`);
    if (project.jalan) assert.ok(line.includes(project.jalan), `${project.slug}: jalan ${project.jalan} tidak ada`);
  }
  const sitemap = await readFile('./public/sitemap.xml', 'utf8');
  for (const [, url] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) assert.ok(llms.includes(`(${url})`), `llms.txt tidak menautkan ${url}`);
});

test('sitemap entries all carry lastmod 2026-11-16', async () => {
  const sitemap = await readFile('./public/sitemap.xml', 'utf8');
  const entries = sitemap.match(/<url>[\s\S]*?<\/url>/g) || [];
  assert.equal(entries.length, 14);
  for (const entry of entries) assert.match(entry, /<lastmod>2026-11-16<\/lastmod>/);
});

test('robots.txt allows search and AI crawlers and keeps the sitemap line', async () => {
  const robots = await readFile('./public/robots.txt', 'utf8');
  assert.doesNotMatch(robots, /Disallow:\s*\//);
  for (const bot of ['\\*', 'Googlebot', 'Bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'Claude-SearchBot', 'ClaudeBot', 'Claude-User', 'PerplexityBot', 'Google-Extended']) {
    assert.match(robots, new RegExp(`User-agent: ${bot}\\nAllow: /\\n`), bot);
  }
  assert.match(robots, /^Sitemap: https:\/\/dewagriyaasri\.com\/sitemap\.xml$/m);
});

test('project location text and schema match data/fakta-proyek.json', () => {
  const byName = new Map(facts.proyek.map((p) => [p.nama, p]));
  const residences = [];
  const walk = (node, file) => {
    if (Array.isArray(node)) return node.forEach((n) => walk(n, file));
    if (!node || typeof node !== 'object') return;
    const types = [].concat(node['@type'] || []);
    if (types.includes('Residence') && byName.has(node.name)) residences.push([file, node]);
    Object.values(node).forEach((v) => walk(v, file));
  };
  for (const [file, html] of pages) {
    assert.doesNotMatch(html, /Panciro/, `${file} masih memuat Panciro (desa Raja-Raja di fakta: Bungaejaya)`);
    for (const [, json] of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) walk(JSON.parse(json), file);
  }
  assert.ok(residences.length >= 3, 'schema Residence proyek tidak ditemukan');
  for (const [file, node] of residences) {
    const project = byName.get(node.name);
    if (node.address) {
      assert.equal(node.address.addressLocality, project.lokasi, `${file}: addressLocality ${node.name}`);
      assert.equal(node.address.postalCode, project.kode_pos ?? undefined, `${file}: postalCode ${node.name}`);
      assert.equal(node.address.streetAddress, project.jalan ?? undefined, `${file}: streetAddress ${node.name}`);
    }
    if (node.geo) {
      assert.equal(node.geo.latitude, project.lat, `${file}: latitude ${node.name}`);
      assert.equal(node.geo.longitude, project.lng, `${file}: longitude ${node.name}`);
    }
  }
  for (const project of facts.proyek) {
    const html = pages.find(([file]) => file.includes(`perumahan/${project.slug}/`))[1];
    assert.ok(html.includes(project.lokasi), `${project.slug}: halaman tidak memuat lokasi ${project.lokasi}`);
  }
});

test('public/_headers carries the same security headers as worker.mjs (minus Content-Type)', async () => {
  const headersFile = await readFile('./public/_headers', 'utf8');
  const worker = await readFile('./worker.mjs', 'utf8');
  const block = worker.match(/const securityHeaders = \{([\s\S]*?)\};/)[1];
  for (const [, name, value] of block.matchAll(/"([^"]+)":\s*"([^"]*)"/g)) {
    if (name === 'Content-Type') continue;
    assert.ok(headersFile.includes(`  ${name}: ${value}\n`), `_headers tidak memuat ${name}`);
  }
  assert.match(headersFile, /^\/\*$/m);
});
