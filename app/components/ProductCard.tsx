import Link from "next/link";
import type { Product } from "../lib/catalog";
import { isRentable } from "../lib/catalog";
import AvailabilityBadge from "./AvailabilityBadge";

/** Reusable product tile used on the home page and the shop catalog. */
export default function ProductCard({ product: p }: { product: Product }) {
  return (
    <Link href={`/product/${p.sku}`} className="prod-card">
      <div className="prod-card__img">
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image} alt={p.name} loading="lazy" />
        ) : null}
        <span className="prod-card__badge-float">
          <AvailabilityBadge product={p} />
        </span>
      </div>
      <div className="prod-card__body">
        <span className="prod-card__cat">{p.subcategory}</span>
        <h3>{p.name}</h3>
        <div className="prod-card__foot">
          {p.availability === "Rental only" ? (
            <span className="prod-card__price">
              ${p.rentalRate?.toFixed(2)}
              <span className="prod-card__per">/day</span>
            </span>
          ) : (
            <span className="prod-card__price">${p.price?.toFixed(2)}</span>
          )}
          {p.availability === "Both" && isRentable(p) ? (
            <span className="prod-card__rent">rent ${p.rentalRate?.toFixed(2)}/day</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
