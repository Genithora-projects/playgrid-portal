// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	// PRD FR: tamamen statik cikti, sunucu/adapter yok (bkz. PRD_Product_Requirements.md > Teknik Yon)
	output: 'static',
	// Vercel tarafindan atanan ilk URL (S1 alan adi henuz kesinlesmedi).
	// S1 kesinlesince tek satir guncelleme yapilacak — canonical, OG meta ve sitemap
	// uretimleri bu URL'i kullanir. Marka adi koda gomulmez (CLAUDE.md kural 15).
	site: 'https://playgrid-portal.vercel.app',
});
