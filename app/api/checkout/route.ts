import { NextResponse } from "next/server";
import { resolveCartLines } from "../../lib/pricing";
import { shippingFee, round2 } from "../../lib/orders";
import { createCheckoutSession, stripeConfigured } from "../../lib/stripe";

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
  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: "Payments aren't configured yet (missing STRIPE_SECRET_KEY)." },
      { status: 503 }
    );
  }

  // Price the cart on the server, then hand the amounts to Stripe.
  let lines;
  try {
    lines = await resolveCartLines(body.items ?? []);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const subtotal = round2(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0));
  const ship = shippingFee(subtotal);

  const line_items: Record<string, unknown>[] = lines.map((l) => ({
    quantity: l.quantity,
    price_data: {
      currency: "usd",
      unit_amount: Math.round(l.unitPrice * 100),
      product_data: { name: l.name },
    },
  }));
  if (ship > 0) {
    line_items.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(ship * 100),
        product_data: { name: "Worldwide shipping" },
      },
    });
  }

  const origin = request.headers.get("origin") || new URL(request.url).origin;

  // Everything the success handler needs to write the order, carried on the session.
  const metadata: Record<string, string> = {
    firstName: body.firstName!.trim(),
    lastName: body.lastName!.trim(),
    email: body.email!.trim(),
    phone: body.phone!.trim(),
    street: body.street!.trim(),
    city: body.city!.trim(),
    region: (body.region ?? "").trim(),
    postalCode: body.postalCode!.trim(),
    country: body.country!.trim(),
    loyalty: body.loyalty ? "1" : "0",
    items: lines.map((l) => `${l.sku}:${l.quantity}`).join(","),
  };

  try {
    const session = await createCheckoutSession({
      mode: "payment",
      customer_email: body.email!.trim(),
      line_items,
      metadata,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("stripe session failed", e);
    return NextResponse.json({ error: "Could not start payment." }, { status: 500 });
  }
}
