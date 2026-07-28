# PRJ-010 — Frontend

Statik Astro projesi. Detaylar: [`PRD_Product_Requirements.md`](../../../01_Requirements_and_Scope/PRD_Product_Requirements.md).

**Durum**: Temel altyapi (M0 baslangici) kuruldu. Bento grid, oyun karti, oyun kabuğu,
SDK ve postMessage sozlesmesi henuz yazilmadi — bkz. proje kokundeki `Agent_Tasks.json`.

## Kurulu olan

- Astro (statik cikti, `output: 'static'`), TypeScript strict
- Content Collections + Zod: oyun manifest semasi (`src/content.config.ts`, FR-021)
- Tasarim token iskeleti (`src/styles/tokens.css`, FR-028/029) — karanlik/aydinlik, FOUC yok
- Temel layout (`src/layouts/BaseLayout.astro`)

## Komutlar

| Komut | Aciklama |
| --- | --- |
| `npm install` | Bagimliliklari kurar |
| `npm run dev` | `localhost:4321`'de dev server |
| `npm run build` | `./dist/`'e statik build |
| `npm run preview` | Build'i lokal onizler |
