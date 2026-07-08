import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { products, getProduct, isRentable, isSellable } from "../../lib/catalog";
import AddToCart from "../../components/AddToCart";
import AvailabilityBadge from "../../components/AvailabilityBadge";

export function generateStaticParams() {
  return products.map((p) => ({ sku: p.sku }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sku: string }>;
}): Promise<Metadata> {
  const { sku } = await params;
  const p = getProduct(sku);
  if (!p) return { title: "Not found — The Rusti Shack" };
  return {
    title: `${p.name} — The Rusti Shack`,
    description: `${p.name} — ${p.category}. Buy or rent at The Rusti Shack on Apo Island.`,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  const { sku } = await params;
  const p = getProduct(sku);
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
              {isSellable(p) && p.price != null && (
                <span className="pdp__buy">${p.price.toFixed(2)}</span>
              )}
              {isRentable(p) && (
                <span className="pdp__rent">
                  or rent ${p.rentalRate?.toFixed(2)}<span className="atc__per">/day</span>
                </span>
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
              rentalRate={p.rentalRate}
              availability={p.availability}
            />

            <p className="pdp__ship">
              🐚 Grab it at the shop on Apo Island, or we&apos;ll ship it worldwide.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
