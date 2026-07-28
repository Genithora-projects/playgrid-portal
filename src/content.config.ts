import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Oyun manifest semasi (FR-021). Semaya uymayan manifest build'i kirar.
const games = defineCollection({
	loader: glob({ pattern: '**/manifest.json', base: './src/content/games' }),
	schema: z.object({
		slug: z.string(),
		title: z.string(),
		tagline: z.string(),
		description: z.string(),
		category: z.enum(['puzzle', 'arcade', 'reflex', 'word', 'strategy', 'idle']),
		tags: z.array(z.string()).default([]),
		size: z.enum(['small', 'wide', 'tall', 'hero']),
		accentColor: z.string(),
		cover: z.string(),
		preview: z.string().optional(),
		orientation: z.enum(['portrait', 'landscape', 'any']).default('any'),
		controls: z.array(z.enum(['keyboard', 'touch', 'gamepad'])),
		sdkVersion: z.number().int().positive(),
		status: z.enum(['draft', 'published']),
		featured: z.boolean().default(false),
		publishedAt: z.coerce.date().optional(),
		updatedAt: z.coerce.date().optional(),
	}),
});

export const collections = { games };
