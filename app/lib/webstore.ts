import {
  WEB,
  shippingFee,
  buildOrderLines,
  round2,
  type OrderRecord,
  type OrderLineRecord,
  type CustomerCore,
  type CustomerContact,
  type CheckoutLineInput,
} from "./orders";
import { upsertWebCustomer } from "./customers";
import { adminSelect, adminInsert } from "./supabase-admin";

/**
 * Web order books, now entirely in Supabase: the customer goes to
 * Customers_Core/Contact (customers.ts) and the Order + OrderLines to the Orders
 * and OrderLines tables here. All writes use the service-role key server-side.
 */
const ORDER_BASE = 900000; // -> ORD900001, ORD900002, ...

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export type CheckoutPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  loyalty: boolean;
  lines: CheckoutLineInput[];
};

export type CreatedOrder = {
  order: OrderRecord;
  lines: OrderLineRecord[];
  custId: string;
  isNewCustomer: boolean;
};

async function nextOrderId(): Promise<string> {
  const rows = await adminSelect<{ OrderID: string }[]>(`Orders?select=OrderID`);
  let max = ORDER_BASE;
  for (const o of rows) {
    const m = /^ORD(\d+)$/.exec(o.OrderID);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `ORD${max + 1}`;
}

export async function createWebOrder(p: CheckoutPayload): Promise<CreatedOrder> {
  // 1) Customer (Core + Contact) -> Supabase, get their id.
  const { id: custId, isNew } = await upsertWebCustomer(p);

  // 2) Build the order + lines.
  const orderId = await nextOrderId();
  const orderLines = buildOrderLines(orderId, p.lines);
  const lineRevenue = round2(orderLines.reduce((s, l) => s + l.LineRevenue, 0));
  const ship = shippingFee(lineRevenue);
  const total = round2(lineRevenue + ship);

  const order: OrderRecord = {
    OrderID: orderId,
    OrderDate: today(),
    CustID: custId,
    LocationID: WEB.LocationID,
    SalesAssociate: WEB.SalesAssociate,
    Channel: WEB.Channel,
    ShippingFee: ship,
    OrderTotal: total,
    PaymentMethod: WEB.PaymentMethod,
  };

  // 3) Write Order then OrderLines to Supabase.
  await adminInsert("Orders", [order]);
  await adminInsert("OrderLines", orderLines);

  return { order, lines: orderLines, custId, isNewCustomer: isNew };
}

/** Idempotency: has this Stripe session already produced an order? */
export async function orderForSession(sessionId: string): Promise<string | null> {
  const rows = await adminSelect<{ order_id: string }[]>(
    `web_checkout_sessions?session_id=eq.${encodeURIComponent(sessionId)}&select=order_id&limit=1`
  );
  return rows[0]?.order_id ?? null;
}

export async function recordSessionOrder(sessionId: string, orderId: string): Promise<void> {
  await adminInsert("web_checkout_sessions", [
    { session_id: sessionId, order_id: orderId },
  ]);
}

export type ShipTo = {
  name: string;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

export async function getWebOrder(orderId: string): Promise<{
  order: OrderRecord;
  lines: OrderLineRecord[];
  shipTo: ShipTo;
} | null> {
  const orders = await adminSelect<OrderRecord[]>(
    `Orders?OrderID=eq.${encodeURIComponent(orderId)}&select=*&limit=1`
  );
  const order = orders[0];
  if (!order) return null;

  const [lines, core, contact] = await Promise.all([
    adminSelect<OrderLineRecord[]>(
      `OrderLines?OrderID=eq.${encodeURIComponent(orderId)}&select=*&order=LineNumber`
    ),
    adminSelect<CustomerCore[]>(
      `Customers_Core?CustomerID=eq.${encodeURIComponent(order.CustID)}&select=*&limit=1`
    ),
    adminSelect<CustomerContact[]>(
      `Customers_Contact?CustomerID=eq.${encodeURIComponent(order.CustID)}&select=*&limit=1`
    ),
  ]);

  const c = core[0];
  const ct = contact[0];
  const shipTo: ShipTo = {
    name: `${c?.FirstName ?? ""} ${c?.LastName ?? ""}`.trim(),
    street: ct?.StreetAddress ?? "",
    city: c?.City ?? "",
    region: ct?.Region ?? "",
    postalCode: ct?.PostalCode ?? "",
    country: c?.Country ?? "",
  };

  return { order, lines, shipTo };
}
