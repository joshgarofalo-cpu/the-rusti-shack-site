import Link from "next/link";
import {
  products,
  categories,
  CATEGORY_ORDER,
  CATEGORY_IMAGE,
  CATEGORY_BLURB,
  getProduct,
  type Product,
} from "./lib/catalog";
import ProductCard from "./components/ProductCard";

/* Semi-transparent scrim over a photo so white text stays legible. */
const CARD_SCRIM =
  "linear-gradient(to top, rgba(9,30,45,0.92) 0%, rgba(9,30,45,0.45) 45%, rgba(9,30,45,0.15) 100%)";

const FEATURED_SKUS = [
  "SNK-002", "FIN-001", "WET-001", "SUR-003",
  "BCH-005", "BCH-003", "FSH-001", "APP-001",
];

const featured = FEATURED_SKUS.map(getProduct).filter(
  (p): p is Product => Boolean(p)
);

const catBy = new Map(categories.map((c) => [c.name, c]));

export default function Home() {
  return (
    <main>
      {/* ---------- Hero ---------- */}
      <section
        className="hero"
        style={{
          backgroundImage:
            "linear-gradient(165deg, rgba(15,58,84,0.82) 0%, rgba(18,88,122,0.68) 55%, rgba(26,127,168,0.72) 100%), url(/lifestyle/BCH-005.jpg)",
        }}
      >
        <div className="container">
          <span className="hero__eyebrow">Apo Island · Philippines</span>
          <h1>Gear up for the reef.</h1>
          <p className="hero__sub">
            The Rusti Shack is the island&apos;s beach &amp; dive shop — snorkel gear,
            surfboards, fishing tackle and beach essentials. Buy online, shipped worldwide.
          </p>
          <div className="hero__actions">
            <Link href="/shop" className="btn btn--primary">Browse the Shop</Link>
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
              <p>Buy online, or rent your gear when you&apos;re on the island.</p>
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
              const meta = catBy.get(name);
              return (
                <Link
                  key={name}
                  href={`/shop?category=${encodeURIComponent(name)}`}
                  className="cat-card"
                  style={{ backgroundImage: `${CARD_SCRIM}, url(${CATEGORY_IMAGE[name]})` }}
                >
                  <h3>{name}</h3>
                  <p>{CATEGORY_BLURB[name]}</p>
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
              <ProductCard key={p.sku} product={p} />
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 36 }}>
            <Link href="/shop" className="btn btn--primary">Shop all {products.length} products</Link>
          </div>
        </div>
      </section>

      {/* ---------- Rentals ---------- */}
      <section id="rentals" className="section section--sand">
        <div className="container">
          <div className="split">
            <div>
              <span className="eyebrow">Rent on the island</span>
              <h2 style={{ fontSize: "2rem", marginTop: 8 }}>Travelling light? Rent your gear.</h2>
              <p style={{ color: "var(--muted)", marginTop: 12 }}>
                No need to fly with fins and a wetsuit. Pick up quality kit at the shop
                on Apo Island, use it for the day, and drop it back on your way out.
                Rentals are in-person only — we don&apos;t rent online.
              </p>
              <ul>
                <li><span>✓</span> Full snorkel sets from a few dollars a day</li>
                <li><span>✓</span> Wetsuits, fins &amp; masks kept dive-shop clean</li>
                <li><span>✓</span> Surfboards &amp; skimboards for every skill level</li>
                <li><span>✓</span> Just show up at the shop — no booking required</li>
              </ul>
              <Link href="/#visit" className="btn btn--primary" style={{ marginTop: 22 }}>
                Find the Shop
              </Link>
            </div>
            <div className="split__art">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/lifestyle/WET-001.jpg" alt="A diver in a rented wetsuit and fins on the reef" loading="lazy" />
            </div>
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
