#!/usr/bin/env node
/**
 * Performans butcesi guard (T-08 / PRD NFR).
 *
 * Build sonrasi dist/ icindeki dosya boyutlarini kontrol eder; her
 * alt limit bir performans bileseniyle eslesir (siralama buyukten
 * kucuge). Bir butce asildiginda exit 1 ile cikar (CI-friendly).
 *
 * Bu CI DEGILDIR — Lighthouse veya gercek ag kosullarini simule etmez.
 * Erken uyari: bir PR'in "satici kit 2MB JS bundle" gibi buyuk bir
 * regresyonu build sonrasi yakalanir.
 */

import { stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..');
const DIST = path.join(projectRoot, 'dist');

/** @type {Array<{pattern: string, limit: number, desc: string}>} */
const BUDGETS = [
	{ pattern: /^index\.html$/,                       limit:    18 * 1024, desc: 'ana sayfa HTML' },
	{ pattern: /^c\/[^/]+\/index\.html$/,             limit:    12 * 1024, desc: 'kategori HTML' },
	{ pattern: /^play\/[^/]+\/index\.html$/,          limit:    18 * 1024, desc: 'oyun sayfasi HTML' },
	{ pattern: /^games\/[^/]+\/index\.html$/,         limit:   200 * 1024, desc: 'oyun kodu (iframe)' },
	{ pattern: /^games\/[^/]+\/cover\.svg$/,          limit:     8 * 1024, desc: 'oyun kapak SVG' },
	{ pattern: /^og\/[^/]+\.png$/,                   limit:   300 * 1024, desc: 'OG 1200x630 PNG' },
	{ pattern: /^icons\/icon-192\.png$/,             limit:    40 * 1024, desc: 'PWA icon 192' },
	{ pattern: /^icons\/icon-512\.png$/,             limit:   120 * 1024, desc: 'PWA icon 512' },
	{ pattern: /^icons\/icon-maskable-512\.png$/,    limit:   120 * 1024, desc: 'PWA icon 512 maskable' },
	{ pattern: /^sdk\/[^/]+\.mjs$/,                  limit:    25 * 1024, desc: 'SDK runtime' },
	{ pattern: /^sw\.js$/,                            limit:     3 * 1024, desc: 'service worker' },
	{ pattern: /^manifest\.json$/,                    limit:     2 * 1024, desc: 'PWA manifest' },
	{ pattern: /^_astro\/.*\.css$/,                   limit:    20 * 1024, desc: 'CSS bundle' },
];

async function listFiles(dir, prefix = '') {
	const out = [];
	let entries;
	try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
	for (const e of entries) {
		if (e.name.startsWith('.')) continue;
		const full = path.join(dir, e.name);
		const rel = prefix === '' ? e.name : `${prefix}/${e.name}`;
		if (e.isDirectory()) {
			out.push(...(await listFiles(full, rel)));
		} else if (e.isFile()) {
			out.push(rel);
		}
	}
	return out;
}

function fmtKb(n) {
	return `${(n / 1024).toFixed(1)} KB`;
}

let failed = 0;
const files = await listFiles(DIST);
console.log('— Performans butcesi (PRD NFR) —\n');

for (const budget of BUDGETS) {
	const matches = files.filter((f) => budget.pattern.test(f));
	if (matches.length === 0) continue;
	console.log(`${budget.desc}`);
	for (const m of matches) {
		const full = path.join(DIST, m);
		const s = await stat(full);
		const ok = s.size <= budget.limit;
		const mark = ok ? 'OK ' : 'XX ';
		console.log(`  ${mark}${m.padEnd(36)} ${fmtKb(s.size).padStart(10)} / ${fmtKb(budget.limit).padStart(10)}`);
		if (!ok) failed++;
	}
	console.log('');
}

let totalBytes = 0;
for (const f of files) {
	const s = await stat(path.join(DIST, f));
	totalBytes += s.size;
}
console.log(`Toplam dist: ${fmtKb(totalBytes)} (${files.length} dosya)`);

if (failed > 0) {
	console.error(`\nButce ihlali: ${failed} dosya siniri asti.`);
	process.exit(1);
}
