#!/usr/bin/env node
/**
 * PWA ikonlari (T-34, FR-032). sharp ile 192x192, 512x512 ve
 * maskable-512 PNG uretir. SVG kaynakli; manifesto uyumlu.
 */

import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..');
const DEST = path.join(projectRoot, 'public', 'icons');

await mkdir(DEST, { recursive: true });

// Yuvarlak koseli brand: gradient (indigo -> amber -> emerald).
// Marka ismi koda gomulmez (kural 15); sadece renk gradyani ile
// portal kimligi temsil edilir.
function svgFor(size, maskable = false) {
	const pad = maskable ? Math.round(size * 0.1) : Math.round(size * 0.05);
	const r = maskable ? Math.round(size * 0.18) : Math.round(size * 0.2);
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
		<defs>
			<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stop-color="#6366f1"/>
				<stop offset="50%" stop-color="#f59e0b"/>
				<stop offset="100%" stop-color="#10b981"/>
			</linearGradient>
			<clipPath id="c"><rect x="${pad}" y="${pad}" width="${size - pad * 2}" height="${size - pad * 2}" rx="${r}" ry="${r}"/></clipPath>
		</defs>
		<rect width="${size}" height="${size}" fill="#0c0c10"/>
		<g clip-path="url(#c)">
			<rect width="${size}" height="${size}" fill="url(#g)"/>
			<g fill="#ffffff" opacity="0.92" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-weight="800" text-anchor="middle">
				<text x="${size / 2}" y="${size * 0.46}" font-size="${size * 0.22}">play</text>
				<text x="${size / 2}" y="${size * 0.66}" font-size="${size * 0.22}">grid</text>
				<circle cx="${size * 0.32}" cy="${size * 0.78}" r="${size * 0.04}" fill="#f4f4f5" opacity="0.7"/>
				<circle cx="${size * 0.5}"  cy="${size * 0.78}" r="${size * 0.04}" fill="#f4f4f5" opacity="0.7"/>
				<circle cx="${size * 0.68}" cy="${size * 0.78}" r="${size * 0.04}" fill="#f4f4f5" opacity="0.7"/>
				<circle cx="${size * 0.86}" cy="${size * 0.78}" r="${size * 0.04}" fill="#f4f4f5" opacity="0.7"/>
			</g>
		</g>
	</svg>`;
}

async function render(name, size, maskable) {
	const svg = svgFor(size, maskable);
	const out = path.join(DEST, `${name}.png`);
	await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);
	console.log(`  + icons/${name}.png (${size}x${size})`);
}

await render('icon-192', 192, false);
await render('icon-512', 512, false);
await render('icon-maskable-512', 512, true);
