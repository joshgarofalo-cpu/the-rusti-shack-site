import { getProduct, isSellable } from "./catalog";
import type { CheckoutLineInput } from "./orders";

export type ResolvedLine = CheckoutLineInput & { name: string };

/**
 * Turn raw {sku, qty} items into priced lines, sourcing price/cost from Supabase
 * on the server — never trusting amounts sent by the browser. Throws on bad input.
 */
export async function resolveCartLines(
  items: { sku: string; qty: number }[]
): Promise<ResolvedLine[]> {
  if (!items?.length) throw new Error("Your cart is empty.");
  const lines: ResolvedLine[] = [];
  for (const it of items) {
    const p = await getProduct(it.sku);
    const qty = Math.floor(Number(it.qty));
    if (!p || !isSellable(p) || p.price == null) {
      throw new Error(`Item not available for online purchase: ${it.sku}`);
    }
    if (!Number.isFinite(qty) || qty < 1) {
      throw new Error(`Bad quantity for ${it.sku}`);
    }
    lines.push({
      sku: p.sku,
      name: p.name,
      quantity: qty,
      unitPrice: p.price,
      unitCost: p.unitCost ?? 0,
    });
  }
  return lines;
}
