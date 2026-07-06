import Link from "next/link";
import products from "../data/products.json";
import categories from "../data/categories.json";

type Product = (typeof products)[number];

/* Emoji lookup by subcategory — keeps the marketing cards playful. */
const SUB_EMOJI: Record<string, string> = {
  Masks: "🤿", Sets: "🥽", Snorkels: "🌊", Fins: "🐬", Wetsuits: "🩱",
  Towels: "🏖️", Shade: "⛱️", "Sun Care": "🧴", Coolers: "🧊", Eyewear: "😎",
  Footwear: "👟", Kids: "🪣", Accessories: "🎒",
  Surfboards: "🏄", Skimboards: "🏄‍♂️", Kitesurf: "🪁",
  Shirts: "👕", Rashguards: "🩱", Hats: "🧢", Swimwear: "🩳", Bottoms: "🩳",
  Rods: "🎣", Reels: "🎣", Bait: "🪱", Nets: "🕸️", Tackle: "🪝",
};

const CATEGORY_INFO: Record<
  string,
  { emoji: string; blurb: string; gradient: string }
> = {
  "Snorkel & Dive": {
    emoji: "🤿",
    blurb: "Masks, fins, snorkels & wetsuits for exploring the reef.",
    gradient: "linear-gradient(160deg,#12587a,#1a7fa8)",
  },
  Surfing: {
    emoji: "🏄",
    blurb: "Boards, skimboards & kitesurf gear for every swell.",
    gradient: "linear-gradient(160deg,#1a7fa8,#2aa6bd)",
  },
  "Beach Essentials": {
    emoji: "🏖️",
    blurb: "Towels, shade, coolers, sunnies & reef-safe sun care.",
    gradient: "linear-gradient(160deg,#e08a3c,#eaa94f)",
  },
  Fishing: {
    emoji: "🎣",
    blurb: "Rods, reels, tackle & fresh bait for the day's catch.",
    gradient: "linear-gradient(160deg,#0f3a54,#2a6f7a)",
  },
  Apparel: {
    emoji: "👕",
    blurb: "Rashguards, tees, hats & swimwear built for salt & sun.",
    gradient: "linear-gradient(160deg,#2a6f7a,#4fa88f)",
  },
};

const CATEGORY_ORDER = [
  "Snorkel & Dive",
  "Surfing",
  "Beach Essentials",
  "Fishing",
  "Apparel",
];

const FEATURED_SKUS = [
  "SNK-002", "FIN-001", "WET-001", "SUR-003",
  "BCH-005", "BCH-003", "FSH-001", "APP-001",
];

const bySku = new Map(products.map((p) => [p.sku, p]));
const featured = FEATURED_SKUS.map((s) => bySku.get(s)).filter(
  (p): p is Product => Boolean(p)
);

const catBy = new Map(categories.map((c) => [c.name, c]));

export default function Home() {
  return (
    <main>
      {/* ---------- Hero ---------- */}
      <section className="hero">
        <div className="container">
          <span className="hero__eyebrow">Apo Island · Philippines</span>
          <h1>Gear up for the reef.</h1>
          <p className="hero__sub">
            The Rusti Shack is the island&apos;s beach &amp; dive shop — snorkel gear,
            surfboards, fishing tackle and beach essentials. Buy it, or rent it for the day.
          </p>
          <div className="hero__actions">
            <Link href="/#shop" className="btn btn--primary">Browse the Shop</Link>
            <Link href="/apo-island" className="btn btn--ghost">Discover Apo Island</Link>
          </div>
        </div>
        <div className="hero__wave" aria-hidden>
          <svg viewBox="0 0 1440 90" preserveAspectRatio="none" style={{ width: "100%", height: 70, display: "block" }}>
            <path fill="#f7f0e2" d="M0,48 C240,90 480,10 720,40 C960,70 1200,20 1440,52 L1440,90 L0,90 Z" />
          </svg>
        </div>
      </section>

      {/* ---------- Trust strip ---------- */}
      <section className="section" style={{ paddingBottom: 40, paddingTop: 48 }}>
        <div className="container">
          <div className="features">
            <div className="feature">
              <div className="feature__icon">🛍️</div>
              <h4>Buy or Rent</h4>
              <p>Own your kit or grab it just for the day.</p>
            </div>
            <div className="feature">
              <div className="feature__icon">🐢</div>
              <h4>Reef-Safe</h4>
              <p>Reef-safe sunscreen &amp; gear that protects the sanctuary.</p>
            </div>
            <div className="feature">
              <div className="feature__icon">📦</div>
              <h4>We Ship Worldwide</h4>
              <p>Can&apos;t make it to the island? We&apos;ll post it to you.</p>
            </div>
            <div className="feature">
              <div className="feature__icon">🤙</div>
              <h4>Local &amp; Friendly</h4>
              <p>Run by islanders who dive the reef every week.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Categories ---------- */}
      <section id="shop" className="section section--sand">
        <div className="container">
          <div className="section__head">
            <span className="eyebrow">Shop by category</span>
            <h2>Everything for a day on the water</h2>
            <p>
              {products.length} products across five categories — from a $6.99 sand bucket
              to a full dive kit.
            </p>
          </div>
          <div className="grid grid--3">
            {CATEGORY_ORDER.map((name) => {
              const info = CATEGORY_INFO[name];
              const meta = catBy.get(name);
              return (
                <Link
                  key={name}
                  href="/#featured"
                  className="cat-card"
                  style={{ background: info.gradient }}
                >
                  <span className="cat-card__emoji">{info.emoji}</span>
                  <h3>{name}</h3>
                  <p>{info.blurb}</p>
                  <div className="cat-card__meta">
                    {meta?.count} products · from ${meta?.priceLow.toFixed(2)}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- Featured products ---------- */}
      <section id="featured" className="section">
        <div className="container">
          <div className="section__head">
            <span className="eyebrow">Fan favourites</span>
            <h2>Gear the island loves</h2>
            <p>A handful of our best-selling picks — most are available to rent, too.</p>
          </div>
          <div className="grid grid--4">
            {featured.map((p) => (
              <article key={p.sku} className="prod-card">
                <span className="prod-card__badge">{p.subcategory}</span>
                <div className="prod-card__emoji">{SUB_EMOJI[p.subcategory] ?? "🐚"}</div>
                <h3>{p.name}</h3>
                <p className="prod-card__sub">{p.category}</p>
                <div className="prod-card__foot">
                  <span className="prod-card__price">${p.price?.toFixed(2)}</span>
                  {p.rentalRate ? (
                    <span className="prod-card__rent">rent ${p.rentalRate.toFixed(2)}/day</span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Rentals ---------- */}
      <section id="rentals" className="section section--sand">
        <div className="container">
          <div className="split">
            <div>
              <span className="eyebrow">Rent, don&apos;t lug</span>
              <h2 style={{ fontSize: "2rem", marginTop: 8 }}>Travelling light? Rent your gear.</h2>
              <p style={{ color: "var(--muted)", marginTop: 12 }}>
                No need to fly with fins and a wetsuit. Pick up quality kit at the shop,
                use it for the day, and drop it back on your way out. Most of our
                Snorkel &amp; Dive and Surfing gear is available by the day.
              </p>
              <ul>
                <li><span>✓</span> Full snorkel sets from a few dollars a day</li>
                <li><span>✓</span> Wetsuits, fins &amp; masks kept dive-shop clean</li>
                <li><span>✓</span> Surfboards &amp; skimboards for every skill level</li>
                <li><span>✓</span> Just show up — no booking required</li>
              </ul>
              <Link href="/#visit" className="btn btn--primary" style={{ marginTop: 22 }}>
                Find the Shop
              </Link>
            </div>
            <div className="split__art" aria-hidden>🤿</div>
          </div>
        </div>
      </section>

      {/* ---------- Visit / stores ---------- */}
      <section id="visit" className="section">
        <div className="container">
          <div className="section__head">
            <span className="eyebrow">Find us</span>
            <h2>Two spots on the island — plus worldwide shipping</h2>
          </div>
          <div className="grid grid--3">
            <div className="info-card">
              <div className="info-card__emoji">🏝️</div>
              <h3>Apo Island Main Shop</h3>
              <p>Our full-range store just up from the beach — every category, buy or rent.</p>
            </div>
            <div className="info-card">
              <div className="info-card__emoji">⛵</div>
              <h3>Dock-Side Kiosk</h3>
              <p>Grab-and-go snorkel gear, sunscreen and towels right where the bangkas land.</p>
            </div>
            <div className="info-card">
              <div className="info-card__emoji">📦</div>
              <h3>International Ship-Out</h3>
              <p>Loved something on your trip? We ship gear and apparel worldwide.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="cta">
        <h2>See you on the reef 🐢</h2>
        <p>
          Swing by The Rusti Shack before you hit the water — and learn what makes
          Apo Island one of the best dive spots in the Philippines.
        </p>
        <Link href="/apo-island" className="btn btn--primary">Discover Apo Island</Link>
      </section>
    </main>
  );
}
