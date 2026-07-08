import type { Product } from "../lib/catalog";

/** Small pill showing whether an item is for sale, rent, or both. */
export default function AvailabilityBadge({ product }: { product: Product }) {
  const label =
    product.availability === "Both"
      ? "Buy or Rent"
      : product.availability === "Rental only"
      ? "Rent only"
      : "For sale";
  const tone =
    product.availability === "Both"
      ? "badge--both"
      : product.availability === "Rental only"
      ? "badge--rent"
      : "badge--sale";
  return <span className={`badge ${tone}`}>{label}</span>;
}
