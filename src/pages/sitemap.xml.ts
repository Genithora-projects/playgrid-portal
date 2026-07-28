import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE_NAME, SITE_DESCRIPTION } from '../lib/site';

/**
 * sitemap.xml (FR-033). Tum published oyun sayfalari + kategori sayfalari
 * + ana sayfa. Astro.site (astro.config.mjs > site) kullanilir; S1 kesin
 * oldugunda URL guncellenir.
 */
export const GET: APIRoute = async ({ site }) => {
	if (!site) return new Response('Sitemap requires astro.config site URL', { status: 500 });
	const games = await getCollection('games', ({ data }) => data.status === 'published');
	const categories = Array.from(new Set(games.map((g) => g.data.category)));

	function urlEntry(loc: string, lastmod?: Date, changefreq = 'monthly', priority = '0.7'): string {
		return [
			'  <url>',
			`    <loc>${loc}</loc>`,
			lastmod ? `    <lastmod>${lastmod.toISOString()}</lastmod>` : '',
			`    <changefreq>${changefreq}</changefreq>`,
			`    <priority>${priority}</priority>`,
			'  </url>',
		].filter(Boolean).join('\n');
	}

	const urls: string[] = [];
	urls.push(urlEntry(site.toString().replace(/\/$/, ''), new Date(), 'weekly', '1.0'));

	for (const g of games) {
		const modDate = g.data.updatedAt ?? g.data.publishedAt ?? new Date();
		urls.push(urlEntry(
			new URL(`/play/${g.data.slug}`, site).toString(),
			modDate,
			g.data.featured ? 'weekly' : 'monthly',
			g.data.featured ? '0.9' : '0.7'
		));
	}

	for (const cat of categories) {
		urls.push(urlEntry(new URL(`/c/${cat}`, site).toString(), undefined, 'weekly', '0.6'));
	}

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;

	return new Response(xml, {
		headers: {
			'content-type': 'application/xml; charset=utf-8',
			'cache-control': 'public, max-age=300',
		},
	});
};
