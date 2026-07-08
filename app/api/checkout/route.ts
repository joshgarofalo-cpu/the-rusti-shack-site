import { NextResponse } from "next/server";
import { getProduct, isSellable } from "../../lib/catalog";
import { createWebOrder, type CheckoutPayload } from "../../lib/webstore";

type Incoming = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  loyalty?: boolean;
  items?: { sku: string; qty: number }[];
};

const required: (keyof Incoming)[] = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "street",
  "city",
  "postalCode",
  "country",
];

export async function POST(request: Request) {
  let body: Incoming;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Validate contact + address fields.
  const missing = required.filter((k) => !String(body[k] ?? "").trim());
  if (missing.length) {
    return NextResponse.json(
      { error: `Missing required field(s): ${missing.join(", ")}` },
      { status: 400 }
    );
  }
  if (!/^\S+@\S+\.\S+$/.test(body.email!.trim())) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  // Re-derive every line from the catalog on the server — never trust client prices.
  if (!body.items?.length) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }
  const lines = [];
  for (const item of body.items) {
    const p = await getProduct(item.sku);
    const qty = Math.floor(Number(item.qty));
    if (!p || !isSellable(p) || p.price == null) {
      return NextResponse.json(
        { error: `Item not available for online purchase: ${item.sku}` },
        { status: 400 }
      );
    }
    if (!Number.isFinite(qty) || qty < 1) {
      return NextResponse.json({ error: `Bad quantity for ${item.sku}` }, { status: 400 });
    }
    lines.push({
      sku: p.sku,
      quantity: qty,
      unitPrice: p.price,
      unitCost: p.unitCost ?? 0,
    });
  }

  const payload: CheckoutPayload = {
    firstName: body.firstName!,
    lastName: body.lastName!,
    email: body.email!,
    phone: body.phone!,
    street: body.street!,
    city: body.city!,
    region: body.region ?? "",
    postalCode: body.postalCode!,
    country: body.country!,
    loyalty: Boolean(body.loyalty),
    lines,
  };

  try {
    const created = await createWebOrder(payload);
    return NextResponse.json({
      orderId: created.order.OrderID,
      total: created.order.OrderTotal,
      shippingFee: created.order.ShippingFee,
    });
  } catch (e) {
    console.error("checkout failed", e);
    return NextResponse.json({ error: "Could not place the order." }, { status: 500 });
  }
}
