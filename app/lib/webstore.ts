import { promises as fs } from "fs";
import path from "path";
import {
  WEB,
  shippingFee,
  buildOrderLines,
  round2,
  type OrderRecord,
  type OrderLineRecord,
  type CheckoutLineInput,
} from "./orders";
import { upsertWebCustomer } from "./customers";

/**
 * Order books for web sales. The CUSTOMER now lives in Supabase (see customers.ts);
 * the Order + OrderLines are still written to local JSON here — that moves to
 * Supabase in 6.7. Local files are fine for test mode; note they don't persist on a
 * serverless host, so the local write is best-effort and never crashes checkout.
 */
const DIR = path.join(process.cwd(), "data", "web-orders");
const F = {
  orders: path.join(DIR, "orders.json"),
  lines: path.join(DIR, "order-lines.json"),
};

const ORDER_BASE = 900000; // -> ORD900001, ORD900002, ...

async function readArr<T>(file: string): Promise<T[]> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T[];
  } catch {
    return [];
  }
}
async function writeArr<T>(file: string, data: T[]): Promise<void> {
  // Best-effort: a read-only serverless filesystem must not break checkout.
  try {
    await fs.mkdir(DIR, { recursive: true });
    await fs.writeFile(file, JSON.stringify(data, null, 2));
  } catch (e) {
    console.warn(`local order store not writable (${file}):`, (e as Error).message);
  }
}

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

export async function createWebOrder(p: CheckoutPayload): Promise<CreatedOrder> {
  // 1) Record the customer in Supabase (Core + Contact) and get their id.
  const { id: custId, isNew } = await upsertWebCustomer(p);

  // 2) Build and store the order + lines (local JSON for now — see 6.7).
  const [orders, lines] = await Promise.all([
    readArr<OrderRecord>(F.orders),
    readArr<OrderLineRecord>(F.lines),
  ]);

  const orderId = `ORD${ORDER_BASE + orders.length + 1}`;
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
    ShipName: `${p.firstName.trim()} ${p.lastName.trim()}`.trim(),
    ShipStreet: p.street.trim(),
    ShipCity: p.city.trim(),
    ShipRegion: p.region.trim(),
    ShipPostalCode: p.postalCode.trim(),
    ShipCountry: p.country.trim(),
  };

  orders.push(order);
  lines.push(...orderLines);
  await Promise.all([writeArr(F.orders, orders), writeArr(F.lines, lines)]);

  return { order, lines: orderLines, custId, isNewCustomer: isNew };
}

export async function getWebOrder(orderId: string) {
  const [orders, lines] = await Promise.all([
    readArr<OrderRecord>(F.orders),
    readArr<OrderLineRecord>(F.lines),
  ]);
  const order = orders.find((o) => o.OrderID === orderId);
  if (!order) return null;
  return { order, lines: lines.filter((l) => l.OrderID === orderId) };
}
