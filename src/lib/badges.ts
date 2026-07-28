import type { Game } from './content';

/**
 * Rozet kurali:
 *  - featured: metadata.featured === true (her zaman)
 *  - new: publishedAt son 30 gun icinde
 *  - updated: updatedAt > publishedAt (oyun guncellenmis) ve son 30 gun
 *
 * Birden fazla rozet olabilir; siralamasi onemli (featured once cikar).
 */

export type BadgeKind = 'featured' | 'new' | 'updated';

export interface Badge {
	kind: BadgeKind;
	label: string;
}

export const BADGE_LABELS: Record<BadgeKind, string> = {
	featured: 'Featured',
	new: 'New',
	updated: 'Updated',
};

export const NEW_WINDOW_DAYS = 30;
export const UPDATED_WINDOW_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function badgesFor(game: Game, now: Date = new Date()): Badge[] {
	const badges: Badge[] = [];
	if (game.data.featured) {
		badges.push({ kind: 'featured', label: BADGE_LABELS.featured });
	}

	const publishedAt = game.data.publishedAt?.getTime() ?? 0;
	const updatedAt = game.data.updatedAt?.getTime() ?? 0;

	if (publishedAt) {
		const ageDays = (now.getTime() - publishedAt) / MS_PER_DAY;
		if (ageDays >= 0 && ageDays < NEW_WINDOW_DAYS) {
			badges.push({ kind: 'new', label: BADGE_LABELS.new });
		}
	}

	if (updatedAt && updatedAt > publishedAt) {
		const ageDays = (now.getTime() - updatedAt) / MS_PER_DAY;
		if (ageDays >= 0 && ageDays < UPDATED_WINDOW_DAYS) {
			badges.push({ kind: 'updated', label: BADGE_LABELS.updated });
		}
	}

	return badges;
}
