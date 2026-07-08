import type { Product } from "../lib/catalog";
import { isRentable } from "../lib/catalog";

/**
 * Online the shop only *sells* — rentals happen on Apo Island. This badge just
 * flags items that can also be rented at the island shop; it is not an online option.
 * Renders nothing for sale-only items.
 */
export default function AvailabilityBadge({ product }: { product: Product }) {
  if (!isRentable(product)) return null;
  return <span className="badge badge--rent">🏝️ Also rents on-island</span>;
}
