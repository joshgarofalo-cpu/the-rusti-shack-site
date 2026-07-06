# The Rusti Shack

Marketing website for **The Rusti Shack** — the beach & dive shop on Apo Island,
Philippines. Built with Next.js 16 (App Router) + React 19, plain CSS (no Tailwind).

## Data

Product and category data is extracted from the real dataset
(`../The_Rusti_Shack_Dataset copy.xlsx`) into:

- `data/products.json` — 45 parent products (SKU, name, category, price, rental rate…)
- `data/categories.json` — per-category counts and price ranges

The site reads these at build time. To regenerate, re-run the extraction against the
source workbook (`Products` sheet, parent rows only).

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Pages

- `/` — homepage: hero, categories, featured products, rentals, stores, CTA
- `/apo-island` — about the island & how to visit
