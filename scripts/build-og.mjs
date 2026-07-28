#!/usr/bin/env node
/**
 * Cover SVG -> PNG 1200x630 OG görsel üretimi (T-33 / FR-033).
 *
 * Her src/content/games/<slug>/cover.svg dosyasini public/og/<slug>.png
 * olarak renderlar. Astro static build sirasinda public/og altindaki
 * dosyalari olduklari gibi dist/og'a tasir.
 *
 * sharp kullanir (native binary bagimliligi var ama endüstri standardi).
 */

import sharp from 'sharp';
import { readdir, readFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..');

const SRC = path.join(projectRoot, 'src', 'content', 'games');
const DEST = path.join(projectRoot, 'public', 'og');

await mkdir(DEST, { recursive: true });

async function exists(p) {
	try { await stat(p); return true; } catch { return false; }
}

async function renderOne(svgPath, pngPath) {
	const svg = await readFile(svgPath);
	await sharp(svg, { density: 192 })
		.resize(1200, 630, {
			fit: 'contain',
			background: { r: 12, g: 12, b: 16 },
		})
		.png({ compressionLevel: 9, palette: false })
		.toFile(pngPath);
}

async function main() {
	if (!(await exists(SRC))) {
		console.log('No src/content/games directory — nothing to render.');
		return;
	}
	const entries = await readdir(SRC, { withFileTypes: true });
	const games = entries.filter((e) => e.isDirectory());
	if (games.length === 0) {
		console.log('No game folders — nothing to render.');
		return;
	}

	let count = 0;
	for (const dirent of games) {
		const slug = dirent.name;
		const svgPath = path.join(SRC, slug, 'cover.svg');
		if (!(await exists(svgPath))) continue;
		const pngPath = path.join(DEST, `${slug}.png`);
		await renderOne(svgPath, pngPath);
		count++;
	}
	console.log(`  + public/og/ (${count} PNG rendered at 1200x630)`);
}

main().catch((err) => {
	console.error('build-og failed:', err);
	process.exit(1);
});
