# CLAUDE.md — Rusti Shack Project

## What this is
An online store for **The Rusti Shack**, a beach & dive shop on Apo Island (Negros
Oriental, Philippines). It sells snorkel & dive gear, surfing gear, fishing tackle,
beach essentials, and apparel. Most items can be **bought or rented by the day**; some
are sale-only or rental-only. The site should feel like a real island shop, not a generic
e-commerce template — Apo Island is a character in this project, not just a backdrop.

> Note: earlier the products were assumed to be "handmade goods." They're not — the real
> catalog (from `data/products.json`, extracted from Rusti's dataset) is branded beach/dive
> gear from suppliers, offered for **sale and rental**. That buy-or-rent duality is the
> shop's signature, so keep it front-and-centre.

## Mood & visual style
- Coastal, warm, unpolished-but-intentional — sun, sand, ocean, easygoing island feel
- Colors (the live tokens in `app/globals.css` — use these, not one-off hexes):
  - Sand `#efe4cb`, light sand `#f7f0e2` (page background)
  - Deep ocean navy `#0f3a54` / `#0a2c41` (nav, footer, headings)
  - Teal `#1a7fa8`, seafoam `#b8e8f5` (accents, links)
  - Coral / gold accent `#e08a3c` / `#c8710f` (buttons, prices, rent tags)
  - Ink `#16323f` (body text), muted `#4f6b78` (secondary text)
- Typography: bold, tight-tracked sans headings; system sans body
  (`"Segoe UI", Roboto, "Helvetica Neue", Arial`). Chosen for reliability/offline builds.
  TODO: if we want a more hand-drawn header face, swap in a self-hosted web font.
- Avoid: generic stock ocean clipart, overly corporate/sterile spacing, cold palettes

## Voice & writing style
Warm, personal, like a real islander talking to a visitor — not salesy, not corporate.
Live examples currently on the site:
- Hero line: "Gear up for the reef."
- Section heading: "Everything for a day on the water"
- Rentals pitch: "Travelling light? Rent your gear."
- Product description example: TODO — no per-product copy yet (marketing pages only).
  When product pages land, write in this voice, e.g. "Fog-free views of the whole reef —
  our most-grabbed mask, and yes, you can rent it for the day."
- Rental-out / empty state: "Looks like this one's out on loan — check back soon."

## Product structure
Categories (real, from the Part 5 catalog analysis):
**Snorkel & Dive · Surfing · Beach Essentials · Fishing · Apparel** (45 product families).
Each product family carries: SKU, name, category, subcategory, price, rentalRate (blank if
not rentable), availability (`Sale only` / `Rental only` / `Both`), variants (size/color),
a studio photo (`/products/{SKU}.jpg`) and an optional lifestyle photo
(`/lifestyle/{SKU}.jpg`). Photo model: one studio shot per **color** (not per size).

## Standing technical instructions
- Keep product/category data in a separate, structured format — it already lives in
  `data/products.json`, `data/categories.json`, `data/images.json` (NOT hardcoded in
  components). Treat it like it's already coming from a database.
- Every page must be checked and confirmed to work well on **mobile (narrow viewport)**
  before being called done — not just "looks fine on desktop." Verify with the browser
  preview at a phone width.
- Reuse consistent components (product card, availability badge, buttons) instead of
  rebuilding similar UI per page. (Current pages use shared CSS classes but not yet
  extracted React components — see status note below.)
- Cart state should persist across pages/navigation even though checkout is a placeholder
  for now.
- No lorem ipsum or placeholder text left in a "finished" section — use real Rusti Shack
  content or clearly mark TODOs.

## Definition of done (check before saying a feature is complete)
- [ ] Works and looks intentional on mobile width
- [ ] Real content, not placeholder text
- [ ] Matches color/type system above
- [ ] Images have alt text
- [ ] Price and sale/rent status clearly visible

## Never do
- Never put passwords, API keys, or other secrets in code or on GitHub. Secrets go in
  environment variables.

---
## Current status vs this spec
Built and mobile-verified:
- **Pages:** home, `/shop` (catalog + category filter), `/product/[sku]` (45 detail
  pages, buy/rent toggle, qty), `/cart` (persistent, demo checkout), Apo Island.
- **Components:** `SiteHeader` (responsive nav + mobile drawer + cart badge),
  `ProductCard`, `AvailabilityBadge`, `AddToCart`, `CartProvider` (localStorage-persisted).
- **Data layer:** `app/lib/catalog.ts` (typed helpers over the JSON data files).
- Availability (Buy / Rent / Both) badges everywhere; real photography; alt text.
- Verified at 375px width: no horizontal overflow, nav drawer, stacked layouts.

Still open / nice-to-have:
- Per-product long-form descriptions (currently name + specs only)
- Size/colour *selection* on the PDP (shown as info, not yet selectable)
- Real checkout + backend (checkout is a demo placeholder by design)
- Note: `next start` (local prod server) hits a Next 16.2.9 Turbopack `_middleware`
  bug; use `next dev` locally. Vercel uses its own runtime and is unaffected.
