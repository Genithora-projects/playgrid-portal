/* Playgrid service worker (T-34, FR-032).
 *
 * Strateji:
 *  - Install: ana kabuk sayfalari precache (/, her /play/<slug>, /sitemap.xml, /robots.txt).
 *  - Runtime: kabuk sayfalari cache-first; varliklar (CSS/JS/SVG/PNG) cache-first; /games/<slug>/* cache-first.
 *  - Offline fallback: ana sayfa her zaman mevcut; /games/<yeniSlug> 404.
 *
 * Sablon Astro `output: 'static'` + manuel cache yonetimi.
 */

const CACHE_VERSION = 'playgrid:v1';
const CORE = [
	'/',
	'/manifest.json',
	'/sitemap.xml',
	'/robots.txt',
	'/favicon.svg',
	'/favicon.ico',
	'/sdk/sdk.mjs',
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
		).then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;

	const url = new URL(req.url);
	if (url.origin !== self.location.origin) return;

	event.respondWith(
		caches.match(req).then((cached) => {
			if (cached) return cached;
			return fetch(req).then((res) => {
				if (res && res.status === 200 && res.type === 'basic') {
					const clone = res.clone();
					caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
				}
				return res;
			}).catch(() => caches.match('/'));
		})
	);
});
