import { getCollection, type CollectionEntry } from 'astro:content';

export type Game = CollectionEntry<'games'>;

/**
 * Sadece 'published' oyunlar (FR-027). 'draft' olanlar yalnizca
 * astro dev / preview'da gorunur (T-XX kapsaminda). Build, draft'i
 * disarida birakir. Siralama: featured DESC, publishedAt DESC, title ASC.
 */
export async function getPublishedGames(): Promise<Game[]> {
	const all = await getCollection('games', ({ data }) => data.status === 'published');
	return all.sort((a, b) => {
		if (a.data.featured !== b.data.featured) return a.data.featured ? -1 : 1;
		const at = a.data.publishedAt?.getTime() ?? 0;
		const bt = b.data.publishedAt?.getTime() ?? 0;
		if (at !== bt) return bt - at;
		return a.data.title.localeCompare(b.data.title);
	});
}

/**
 * Sadece published oyunlarin slug listesi. Rastgele oyun (T-30) ve
 * sitemap gibi tek-yer-baglantisinda kullanilir.
 */
export async function getPublishedSlugs(): Promise<string[]> {
	const all = await getCollection('games', ({ data }) => data.status === 'published');
	return all.map((g) => g.data.slug);
}
