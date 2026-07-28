#!/usr/bin/env node
/**
 * src/content/games/<slug>/ icindeki varliklari (manifest.json HARIC)
 * public/games/<slug>/ altina kopyalar. Boylece oyun klasoru tek
 * yerde (kural: "yeni oyun = tek klasor") kalir, ama Astro statik
 * host olarak /games/<slug>/<file> URL'lerini serve edebilir.
 *
 * Calisma anlari:
 *  - npm run sync-games
 *  - prebuild + predev kancalari (otomatik)
 *  - Gelistirici elle (mkdir + cp, atomic degil; idempotent)
 */

import { cp, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..');
const SRC = path.join(projectRoot, 'src', 'content', 'games');
const DEST = path.join(projectRoot, 'public', 'games');

const ALLOWED_EXT = new Set([
	'.html', '.css', '.js', '.mjs', '.cjs',
	'.svg', '.webp', '.avif', '.png', '.jpg', '.jpeg', '.gif',
	'.woff', '.woff2', '.ttf', '.otf',
	'.mp3', '.ogg', '.wav', '.m4a', '.webm', '.mp4',
]);

async function exists(p) {
	try { await stat(p); return true; } catch { return false; }
}

async function syncDir(srcDir, destDir, slug) {
	if (!(await exists(srcDir))) return;
	await cp(srcDir, destDir, {
		recursive: true,
		filter: (src) => {
			const ext = path.extname(src).toLowerCase();
			if (src.endsWith('manifest.json') || src.endsWith('LICENSE.md')) return false;
			if (ext === '') return true;
			return ALLOWED_EXT.has(ext);
		},
	});
	console.log(`  ✓ synced games/${slug}/`);
}

async function main() {
	if (!(await exists(SRC))) {
		console.log('No src/content/games directory — nothing to sync.');
		return;
	}
	const entries = await readdir(SRC, { withFileTypes: true });
	const games = entries.filter((e) => e.isDirectory());
	if (games.length === 0) {
		console.log('No game folders — nothing to sync.');
		return;
	}
	if (!existsSync(DEST)) {
		const { mkdir } = await import('node:fs/promises');
		await mkdir(DEST, { recursive: true });
	}
	console.log(`Syncing ${games.length} game folder(s) to public/games/`);
	for (const dirent of games) {
		await syncDir(
			path.join(SRC, dirent.name),
			path.join(DEST, dirent.name),
			dirent.name
		);
	}
}

main().catch((err) => {
	console.error('sync-games failed:', err);
	process.exit(1);
});
