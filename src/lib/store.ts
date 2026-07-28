/**
 * localStorage read/write katmani (FR-017/018/019/020).
 *
 * Sema Zod versiyonu lib/store-schema.ts ile paylasilir; bu dosya DUSUK
 * runtime maliyetli dogrulama yapar (sadece gerekli alanlar). Sunucuda
 * CALISTIRILMAZ; `localStorage` olmadigi icin ilk satirinda erken cikar.
 *
 * Bundle'a Zod ALINMAZ — bu performans butcesi ile uyumlu.
 */

export const STORE_KEY = 'playgrid:v1';

export type Theme = 'light' | 'dark';

export type Score = {
	best: number;
	plays: number;
	lastScore: number;
	lastPlayedAt: number;
};

export type Store = {
	version: 1;
	scores: Record<string, Score>;
	progress: Record<string, Record<string, unknown>>;
	lastPlayed: Array<{ slug: string; ts: number }>;
	favorites: string[];
	theme: Theme;
};

export function getSystemTheme(): Theme {
	if (typeof window === 'undefined' || !window.matchMedia) return 'light';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readRaw(): unknown {
	try {
		const raw = localStorage.getItem(STORE_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

function writeRaw(value: Store): void {
	try {
		localStorage.setItem(STORE_KEY, JSON.stringify(value));
	} catch {}
}

function coerce(raw: unknown): Store | null {
	if (!raw || typeof raw !== 'object') return null;
	const r = raw as Partial<Store>;
	if (r.version !== 1) return null;

	const theme: Theme = r.theme === 'dark' ? 'dark' : 'light';

	const scores: Record<string, Score> = {};
	if (r.scores && typeof r.scores === 'object') {
		for (const [slug, s] of Object.entries(r.scores)) {
			if (
				s && typeof s === 'object' &&
				typeof (s as Score).best === 'number' &&
				typeof (s as Score).plays === 'number'
			) {
				scores[slug] = {
					best: (s as Score).best,
					plays: (s as Score).plays,
					lastScore: (s as Score).lastScore ?? (s as Score).best,
					lastPlayedAt: (s as Score).lastPlayedAt ?? 0,
				};
			}
		}
	}

	const progress: Record<string, Record<string, unknown>> = {};
	if (r.progress && typeof r.progress === 'object') {
		for (const [slug, p] of Object.entries(r.progress)) {
			if (p && typeof p === 'object') progress[slug] = p as Record<string, unknown>;
		}
	}

	const lastPlayed = Array.isArray(r.lastPlayed)
		? r.lastPlayed
			.filter(
				(p): p is { slug: string; ts: number } =>
					!!p && typeof p === 'object' && typeof (p as { slug?: unknown }).slug === 'string'
			)
			.slice(0, 10)
		: [];

	const favorites = Array.isArray(r.favorites)
		? r.favorites.filter((s): s is string => typeof s === 'string')
		: [];

	return {
		version: 1,
		scores,
		progress,
		lastPlayed,
		favorites,
		theme,
	};
}

export function loadStore(): Store {
	const coerced = coerce(readRaw());
	if (coerced) return coerced;
	const fresh: Store = {
		version: 1,
		scores: {},
		progress: {},
		lastPlayed: [],
		favorites: [],
		theme: getSystemTheme(),
	};
	writeRaw(fresh);
	return fresh;
}

export function updateStore(mutate: (s: Store) => Store): Store {
	const next = mutate(loadStore());
	writeRaw(next);
	return next;
}

export function getStoredTheme(): Theme | null {
	const r = readRaw();
	if (!r || typeof r !== 'object') return null;
	const t = (r as { theme?: unknown }).theme;
	return t === 'light' || t === 'dark' ? t : null;
}

export function setStoredTheme(theme: Theme): void {
	updateStore((s) => ({ ...s, theme }));
}
