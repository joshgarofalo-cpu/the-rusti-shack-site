import type { Metadata } from "next";
import Link from "next/link";
import { products, CATEGORY_ORDER } from "../lib/catalog";
import ProductCard from "../components/ProductCard";

export const metadata: Metadata = {
  title: "Shop — The Rusti Shack",
  description:
    "Browse every product at The Rusti Shack — snorkel & dive, surfing, beach essentials, fishing and apparel. Buy online, shipped worldwide from Apo Island.",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const active = category && CATEGORY_ORDER.includes(category) ? category : null;

  const list = (active ? products.filter((p) => p.category === active) : products)
    .slice()
    .sort((a, b) => (b.price ?? 0) - (a.price ?? 0));

  return (
    <main>
      <section className="shop-hero">
        <div className="container">
          <span className="eyebrow" style={{ color: "var(--seafoam)" }}>The shop</span>
          <h1>{active ?? "Everything in the shack"}</h1>
          <p>
            {active
              ? `${list.length} ${active} product${list.length === 1 ? "" : "s"} — buy online, shipped worldwide.`
              : `All ${products.length} products across five categories. Buy online — we ship worldwide.`}
          </p>
        </div>
      </section>

      <div className="container">
        {/* Category filter */}
        <nav className="filter" aria-label="Filter by category">
          <Link href="/shop" className={`filter__chip ${!active ? "is-active" : ""}`}>
            All
          </Link>
          {CATEGORY_ORDER.map((c) => (
            <Link
              key={c}
              href={`/shop?category=${encodeURIComponent(c)}`}
              className={`filter__chip ${active === c ? "is-active" : ""}`}
            >
              {c}
            </Link>
          ))}
        </nav>

        <section className="section" style={{ paddingTop: 8 }}>
          <div className="grid grid--4">
            {list.map((p) => (
              <ProductCard key={p.sku} product={p} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
