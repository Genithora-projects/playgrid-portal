#!/usr/bin/env node
/**
 * Oyun iskeleti ureteci (T-19, FR-023).
 *
 * Kullanim:
 *   npm run create-game <slug> [--title "..."] [--category arcade] [--size wide] [--accent "#06b6d4"]
 *
 * Tek komut sonrasi uretilir:
 *   - src/content/games/<slug>/manifest.json (FR-021 alanlariyla birebir)
 *   - src/content/games/<slug>/index.html (calisir bos oyun: ready + score + gameover mesajlari)
 *   - src/content/games/<slug>/cover.svg (accent renginde kapak placeholder)
 *   - src/content/games/<slug>/LICENSE.md (ozgun uretim notu)
 *
 * Sonraki adimlar:
 *   1. src/content/games/<slug>/src/main.ts duzenle (oyun mantigi)
 *   2. npm run dev ile calistir — kart otomatik gorunur
 *   3. manifest'i son haline getir (kategori/size/orientation/cover)
 *
 * Bu CLI sadece iskelet uretir; oyun icerigi gelistiricinin sorumlulugundadir.
 */

import { mkdir, writeFile, stat, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..');

const VALID_CATEGORIES = ['puzzle', 'arcade', 'reflex', 'word', 'strategy', 'idle'];
const VALID_SIZES = ['small', 'wide', 'tall', 'hero'];

function parseArgs(argv) {
	const positional = [];
	const flags = {};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a.startsWith('--')) {
			const key = a.slice(2);
			const next = argv[i + 1];
			if (next && !next.startsWith('--')) {
				flags[key] = next;
				i++;
			} else {
				flags[key] = true;
			}
		} else {
			positional.push(a);
		}
	}
	return { positional, flags };
}

function humanize(slug) {
	return slug
		.split('-')
		.filter(Boolean)
		.map((w) => w[0].toUpperCase() + w.slice(1))
		.join(' ');
}

function banner(text) {
	const bar = '═'.repeat(text.length + 4);
	console.log(`\n  ${bar}\n   ${text}\n  ${bar}\n`);
}

async function exists(p) {
	try { await access(p); return true; } catch { return false; }
}

function manifestTemplate({ slug, title, tagline, category, size, accentColor, sdkVersion }) {
	return JSON.stringify(
		{
			slug,
			title,
			tagline,
			description: tagline,
			category,
			tags: [],
			size,
			accentColor,
			cover: 'cover.svg',
			orientation: 'any',
			controls: ['keyboard', 'touch'],
			sdkVersion,
			status: 'draft',
			featured: false,
		},
		null,
		'\t'
	) + '\n';
}

function licenseTemplate(slug, accentColor) {
	return `# Varlık Lisansı — ${humanize(slug)}

**Durum**: Tüm varlıklar ve oyun kodu **özgün üretim**dir. Bilinen oyunların isim,
karakter veya birebir mekaniği kullanılmaz (PRD § "Gizlilik ve Yasal Uyumluluk — Telif").

| Varlık | Kaynak | Lisans |
|---|---|---|
| \`cover.svg\` | Özgün | Bu oyun klasörü ile sınırlı |
| Oyun kodu (\`src/\`) | Özgün | Aynı proje lisansı ile |
| Oyun varlıkları | Özgün | Aynı proje lisansı ile |
| Varlık rengi | ${accentColor} | — |
`;
}

function coverTemplate({ title, accentColor }) {
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" role="img" aria-label="${title} placeholder cover">
	<rect width="800" height="450" fill="${accentColor}" />
	<g fill="#ffffff" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">
		<text x="400" y="240" font-size="72" font-weight="700">${title}</text>
		<text x="400" y="300" font-size="20" font-weight="500" opacity="0.85">Placeholder cover — replace with real artwork</text>
	</g>
</svg>
`;
}

const GAME_BOILERPLATE_HTML = `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
		<title>__TITLE__</title>
		<style>
			:root { color-scheme: light dark; }
			html, body { margin: 0; padding: 0; height: 100dvh; background: #0c0c10; color: #f4f4f5;
				font-family: system-ui, -apple-system, sans-serif; overflow: hidden; touch-action: manipulation; }
			canvas { display: block; width: 100vw; height: 100dvh; }
			.hud { position: fixed; top: 12px; left: 12px; padding: 8px 14px; background: rgba(0,0,0,.35);
				color: #fff; border-radius: 12px; font: 600 14px/1 system-ui; backdrop-filter: blur(6px); }
		</style>
	</head>
	<body>
		<div class="hud" id="hud">Tap to score</div>
		<canvas id="c"></canvas>
		<script type="module">
			// SDK baglanti notu: bu oyun hala T-22 baglaminda 'bos' — ready + score + gameover
			// mesajlari gonderir ki kabuk oyun tarafindan yanit alindigini gorup skor kaydedebilsin
			// (T-11, T-12, T-18). Oyuncu davranisi en basit haliyle 'tikla ve puan kazan'.
			import { createGame } from '/sdk/sdk.mjs';

			const game = createGame({
				slug: '__SLUG__',
				sdkVersion: 1,
				onPause() { running = false; },
				onResume() { running = true; last = performance.now(); },
				onMute(_m) { /* kendi ses baglaminda ele al */ },
			});

			const canvas = document.getElementById('c');
			const ctx = canvas.getContext('2d');
			const hud = document.getElementById('hud');

			function resize() {
				const dpr = Math.min(window.devicePixelRatio || 1, 2);
				canvas.width = Math.floor(canvas.clientWidth * dpr);
				canvas.height = Math.floor(canvas.clientHeight * dpr);
				ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			}
			resize();
			window.addEventListener('resize', resize);

			let score = 0;
			let running = true;
			let last = performance.now();

			function frame(now) {
				requestAnimationFrame(frame);
				if (!running) return;
				const dt = (now - last) / 1000;
				last = now;
				ctx.fillStyle = '#0c0c10';
				ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
				const t = now / 600;
				const x = canvas.clientWidth / 2 + Math.cos(t) * 80;
				const y = canvas.clientHeight / 2 + Math.sin(t * 1.3) * 60;
				ctx.fillStyle = '__ACCENT__';
				ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill();
			}
			requestAnimationFrame(frame);

			function tap() {
				if (!running) return;
				score += 1;
				hud.textContent = 'Score ' + score;
				game.reportScore(score);
				if (score >= 5) {
					game.reportGameover(score);
				}
			}
			canvas.addEventListener('click', tap);
			canvas.addEventListener('touchstart', (e) => { e.preventDefault(); tap(); }, { passive: false });
			window.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tap(); } });

			game.ready();
		</script>
	</body>
</html>
`;

function gameHtmlTemplate({ title, slug, accentColor }) {
	return GAME_BOILERPLATE_HTML
		.replaceAll('__TITLE__', title)
		.replaceAll('__SLUG__', slug)
		.replaceAll('__ACCENT__', accentColor);
}

async function confirm(question, defaultYes = true) {
	const rl = createInterface({ input: stdin, output: stdout });
	const hint = defaultYes ? '[Y/n]' : '[y/N]';
	const ans = (await rl.question(`  ${question} ${hint}: `)).trim().toLowerCase();
	rl.close();
	if (ans === '') return defaultYes;
	if (ans === 'y' || ans === 'yes') return true;
	if (ans === 'n' || ans === 'no') return false;
	return defaultYes;
}

async function readSdkVersion() {
	// SDK versiyonu astro'dan bagimsiz; postMessage sozlesmesinin major'unu
	// temsil eder. v1 (FR-012) ile basliyoruz; ileri surumlerde (v2) kabuk
	// hem v1 hem v2'yi desteklemeye devam eder.
	return 1;
}

async function run() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const slug = positional[0];

	if (!slug) {
		console.error('Kullanim: npm run create-game <slug> [--title "..."] [--category arcade] [--size wide] [--accent "#06b6d4"]');
		process.exit(1);
	}
	if (!/^[a-z0-9-]+$/.test(slug)) {
		console.error('Hata: slug sadece kucuk harf, rakam ve tire icermeli (ornek: color-tiles).');
		process.exit(1);
	}

	const title = flags.title ? String(flags.title) : humanize(slug);
	const tagline = flags.tagline ? String(flags.tagline) : 'A new game — describe it here.';
	const category = VALID_CATEGORIES.includes(flags.category) ? String(flags.category) : 'arcade';
	const size = VALID_SIZES.includes(flags.size) ? String(flags.size) : 'wide';
	const accentColor = typeof flags.accent === 'string' && /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(flags.accent)
		? String(flags.accent)
		: '#06b6d4';

	const targetDir = path.join(projectRoot, 'src', 'content', 'games', slug);
	if (await exists(targetDir)) {
		const ok = await confirm(`'${slug}' klasoru zaten var. Uzerine yazilsin mi?`, false);
		if (!ok) {
			console.log('Iptal.');
			process.exit(0);
		}
	}

	const sdkVersion = await readSdkVersion();

	banner(`Oyun iskeleti: ${slug}`);
	console.log(`  Title:      ${title}`);
	console.log(`  Category:   ${category}`);
	console.log(`  Size:       ${size}`);
	console.log(`  Accent:     ${accentColor}`);
	console.log(`  SDK:        v${sdkVersion}`);
	console.log(`  Target:     ${path.relative(projectRoot, targetDir)}`);
	console.log('');

	await mkdir(targetDir, { recursive: true });

	const files = {
		'manifest.json': manifestTemplate({ slug, title, tagline, category, size, accentColor, sdkVersion }),
		'LICENSE.md': licenseTemplate(slug, accentColor),
		'cover.svg': coverTemplate({ title, accentColor }),
		'index.html': gameHtmlTemplate({ title, slug, accentColor }),
	};

	for (const [name, body] of Object.entries(files)) {
		await writeFile(path.join(targetDir, name), body, 'utf8');
		console.log(`  + ${name}`);
	}

	console.log('\n  Sonraki adimlar:');
	console.log('    1. src/content/games/' + slug + '/index.html icindeki oyun kodunu duzenle');
	console.log('    2. cover.svg tasarimini kendi gorseliyle degistir');
	console.log('    3. manifest.json -> status: "published" ve oyun alanlarini tamamla');
	console.log('    4. npm run dev ile test et\n');
}

run().catch((err) => {
	console.error('create-game failed:', err);
	process.exit(1);
});
