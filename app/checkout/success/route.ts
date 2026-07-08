import { NextResponse } from "next/server";
import { retrieveCheckoutSession } from "../../lib/stripe";
import { resolveCartLines } from "../../lib/pricing";
import {
  createWebOrder,
  orderForSession,
  recordSessionOrder,
  type CheckoutPayload,
} from "../../lib/webstore";

/** Stripe redirects the browser here (GET) after the hosted payment page. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) return NextResponse.redirect(`${origin}/cart`);

  try {
    const session = await retrieveCheckoutSession(sessionId);

    // Only record the order once payment actually went through.
    if (session.payment_status !== "paid") {
      return NextResponse.redirect(`${origin}/cart?canceled=1`);
    }

    // Already processed (e.g. a refresh)? Just show the existing order.
    const existing = await orderForSession(sessionId);
    if (existing) {
      return NextResponse.redirect(`${origin}/checkout/confirmed?session=${sessionId}`);
    }

    // Rebuild the order from the session metadata, re-pricing on the server.
    const m = session.metadata || {};
    const items = (m.items || "")
      .split(",")
      .filter(Boolean)
      .map((pair) => {
        const [sku, qty] = pair.split(":");
        return { sku, qty: Number(qty) };
      });
    const lines = await resolveCartLines(items);

    const payload: CheckoutPayload = {
      firstName: m.firstName || "",
      lastName: m.lastName || "",
      email: m.email || session.metadata?.email || "",
      phone: m.phone || "",
      street: m.street || "",
      city: m.city || "",
      region: m.region || "",
      postalCode: m.postalCode || "",
      country: m.country || "",
      loyalty: m.loyalty === "1",
      lines,
    };

    const created = await createWebOrder(payload);
    await recordSessionOrder(sessionId, created.order.OrderID);

    return NextResponse.redirect(`${origin}/checkout/confirmed?session=${sessionId}`);
  } catch (e) {
    console.error("checkout success handling failed", e);
    return NextResponse.redirect(`${origin}/cart?error=1`);
  }
}
