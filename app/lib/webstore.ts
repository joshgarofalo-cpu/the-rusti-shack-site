import { promises as fs } from "fs";
import path from "path";
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

/**
 * A tiny file-backed "books" for web orders, written in Rusti's exact columns so
 * they import straight into her sheets. Local files are fine for test mode; a real
 * deployment would swap this for a database (serverless filesystems are ephemeral).
 */
const DIR = path.join(process.cwd(), "data", "web-orders");
const F = {
  orders: path.join(DIR, "orders.json"),
  lines: path.join(DIR, "order-lines.json"),
  core: path.join(DIR, "customers-core.json"),
  contact: path.join(DIR, "customers-contact.json"),
};

// Web IDs live in their own high block so they never collide with counter sales.
const ORDER_BASE = 900000; // -> ORD900001, ORD900002, ...
const CUST_BASE = 90000; // -> C90001, C90002, ...

async function readArr<T>(file: string): Promise<T[]> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T[];
  } catch {
    return [];
  }
}
async function writeArr<T>(file: string, data: T[]): Promise<void> {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
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
  customer: CustomerCore;
  isNewCustomer: boolean;
};

/** Reuse a customer by email if we've seen them, otherwise mint a new C-code. */
async function findOrCreateCustomer(
  core: CustomerCore[],
  contact: CustomerContact[],
  p: CheckoutPayload
): Promise<{ id: string; isNew: boolean }> {
  const email = p.email.trim().toLowerCase();
  const existing = contact.find((c) => c.Email.trim().toLowerCase() === email);
  if (existing) return { id: existing.CustomerID, isNew: false };

  const id = `C${CUST_BASE + core.length + 1}`;
  core.push({
    CustomerID: id,
    FirstName: p.firstName.trim(),
    LastName: p.lastName.trim(),
    CustomerType: WEB.CustomerType,
    JoinDate: today(),
    City: p.city.trim(),
    Country: p.country.trim(),
  });
  contact.push({
    CustomerID: id,
    Email: p.email.trim(),
    Phone: p.phone.trim(),
    LoyaltyMember: p.loyalty ? "Yes" : "No",
  });
  return { id, isNew: true };
}

export async function createWebOrder(p: CheckoutPayload): Promise<CreatedOrder> {
  const [orders, lines, core, contact] = await Promise.all([
    readArr<OrderRecord>(F.orders),
    readArr<OrderLineRecord>(F.lines),
    readArr<CustomerCore>(F.core),
    readArr<CustomerContact>(F.contact),
  ]);

  const { id: custId, isNew } = await findOrCreateCustomer(core, contact, p);

  const orderId = `ORD${ORDER_BASE + orders.length + 1}`;
  const orderLines = buildOrderLines(orderId, p.lines);
  const lineRevenue = round2(
    orderLines.reduce((s, l) => s + l.LineRevenue, 0)
  );
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

  await Promise.all([
    writeArr(F.orders, orders),
    writeArr(F.lines, lines),
    writeArr(F.core, core),
    writeArr(F.contact, contact),
  ]);

  const customer = core.find((c) => c.CustomerID === custId)!;
  return { order, lines: orderLines, customer, isNewCustomer: isNew };
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
