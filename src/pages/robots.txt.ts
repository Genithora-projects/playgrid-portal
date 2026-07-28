import type { APIRoute } from 'astro';

/**
 * robots.txt (FR-033). Statik; sitemap URL dahil. Astro.site yoksa
 * 500 — astro.config.mjs > site alani zorunlu.
 */
export const GET: APIRoute = ({ site }) => {
	if (!site) return new Response('robots.txt requires astro.config site URL', { status: 500 });
	const origin = site.toString().replace(/\/$/, '');
	const body = [
		'User-agent: *',
		'Allow: /',
		`Sitemap: ${origin}/sitemap.xml`,
		'',
	].join('\n');
	return new Response(body, {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'public, max-age=3600',
		},
	});
};
