import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllProducts, getProduct, isRentable } from "../../lib/catalog";
import AddToCart from "../../components/AddToCart";
import AvailabilityBadge from "../../components/AvailabilityBadge";

export async function generateStaticParams() {
  const products = await getAllProducts();
  return products.map((p) => ({ sku: p.sku }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sku: string }>;
}): Promise<Metadata> {
  const { sku } = await params;
  const p = await getProduct(sku);
  if (!p) return { title: "Not found — The Rusti Shack" };
  return {
    title: `${p.name} — The Rusti Shack`,
    description: `${p.name} — ${p.category}. Buy online at The Rusti Shack; we ship worldwide from Apo Island.`,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  const { sku } = await params;
  const p = await getProduct(sku);
  if (!p) notFound();

  const sizes = [...new Set(p.variants.map((v) => v.size).filter(Boolean))];
  const colors = p.colors.map((c) => c.color).filter(Boolean);

  return (
    <main>
      <div className="container">
        <div className="crumbs">
          <Link href="/shop">Shop</Link>
          <span aria-hidden> / </span>
          <Link href={`/shop?category=${encodeURIComponent(p.category)}`}>{p.category}</Link>
        </div>

        <div className="pdp">
          <div className="pdp__media">
            {p.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image} alt={p.name} className="pdp__photo" />
            ) : null}
            {p.lifestyle ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.lifestyle} alt={`${p.name} in use`} className="pdp__life" loading="lazy" />
            ) : null}
          </div>

          <div className="pdp__info">
            <AvailabilityBadge product={p} />
            <h1>{p.name}</h1>
            <p className="pdp__cat">{p.category} · {p.subcategory}</p>

            <div className="pdp__price">
              {p.price != null && (
                <span className="pdp__buy">${p.price.toFixed(2)}</span>
              )}
            </div>

            {colors.length > 0 && (
              <p className="pdp__meta">
                <strong>Colours:</strong> {colors.join(", ")}
              </p>
            )}
            {sizes.length > 0 && (
              <p className="pdp__meta">
                <strong>Sizes:</strong> {sizes.join(", ")}
              </p>
            )}
            {p.supplier && (
              <p className="pdp__meta pdp__meta--muted">By {p.supplier}</p>
            )}

            <AddToCart
              sku={p.sku}
              name={p.name}
              image={p.image}
              price={p.price}
            />

            <p className="pdp__ship">
              🐚 We ship worldwide from Apo Island.
            </p>
            {isRentable(p) && (
              <p className="pdp__ship pdp__ship--rent">
                🏝️ Prefer to rent? This one&apos;s available by the day at the shop on
                Apo Island — rentals aren&apos;t sold online.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
