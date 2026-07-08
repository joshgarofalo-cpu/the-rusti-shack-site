import { adminSelect } from "./supabase-admin";
import { getAllProducts } from "./catalog";
import type {
  OrderRecord,
  OrderLineRecord,
  CustomerCore,
} from "./orders";

export type ManagerData = {
  orders: OrderRecord[]; // newest first
  lines: OrderLineRecord[];
  core: CustomerCore[];
  productName: Map<string, string>;
};

export async function fetchManagerData(): Promise<ManagerData> {
  const [orders, lines, core, products] = await Promise.all([
    adminSelect<OrderRecord[]>("Orders?select=*&order=OrderID.desc"),
    adminSelect<OrderLineRecord[]>("OrderLines?select=*&order=OrderID,LineNumber"),
    adminSelect<CustomerCore[]>("Customers_Core?select=*"),
    getAllProducts(),
  ]);
  return {
    orders,
    lines,
    core,
    productName: new Map(products.map((p) => [p.sku, p.name])),
  };
}

/* ---------- CSV helpers ---------- */
function cell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  // Neutralize spreadsheet formula injection: a cell starting with = + - @ (or a
  // control char) can execute in Excel/Sheets. Prefix with an apostrophe so it's
  // treated as text. (Customer names/addresses flow into these files.)
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCSV(headers: string[], rows: unknown[][]): string {
  const out = [headers.join(","), ...rows.map((r) => r.map(cell).join(","))];
  return "﻿" + out.join("\r\n"); // BOM so Excel reads UTF-8 correctly
}

/** The headline export: one row per item sold, with columns Rusti recognizes. */
export async function salesCSV(): Promise<string> {
  const { orders, lines, core, productName } = await fetchManagerData();
  const orderById = new Map(orders.map((o) => [o.OrderID, o]));
  const custById = new Map(core.map((c) => [c.CustomerID, c]));

  const headers = [
    "OrderID", "OrderDate", "FirstName", "LastName", "Country",
    "ProductCode", "ProductName", "Quantity", "UnitPrice", "LineRevenue",
    "ShippingFee", "OrderTotal", "PaymentMethod",
  ];
  const rows = lines.map((l) => {
    const o = orderById.get(l.OrderID);
    const c = o ? custById.get(o.CustID) : undefined;
    return [
      l.OrderID, o?.OrderDate, c?.FirstName, c?.LastName, c?.Country,
      l.ProductCode, productName.get(l.ProductCode) ?? "", l.Quantity, l.UnitPrice, l.LineRevenue,
      o?.ShippingFee, o?.OrderTotal, o?.PaymentMethod,
    ];
  });
  return toCSV(headers, rows);
}

/* ---------- Extra credit: raw per-table exports ---------- */
const TABLES: Record<string, { path: string; cols: string[]; file: string }> = {
  orders: {
    path: "Orders?select=*&order=OrderID",
    cols: ["OrderID", "OrderDate", "CustID", "LocationID", "SalesAssociate", "Channel", "ShippingFee", "OrderTotal", "PaymentMethod"],
    file: "orders.csv",
  },
  orderlines: {
    path: "OrderLines?select=*&order=OrderID,LineNumber",
    cols: ["OrderID", "LineNumber", "ProductCode", "Quantity", "UnitPrice", "DiscountPct", "LineRevenue", "LineCost", "EffectiveDiscountAmount"],
    file: "order-lines.csv",
  },
  customers_core: {
    path: "Customers_Core?select=*&order=CustomerID",
    cols: ["CustomerID", "FirstName", "LastName", "CustomerType", "JoinDate", "City", "Country"],
    file: "customers-core.csv",
  },
  customers_contact: {
    path: "Customers_Contact?select=*&order=CustomerID",
    cols: ["CustomerID", "Email", "Phone", "LoyaltyMember", "StreetAddress", "Region", "PostalCode"],
    file: "customers-contact.csv",
  },
};

export async function tableCSV(
  key: string
): Promise<{ csv: string; file: string } | null> {
  const t = TABLES[key];
  if (!t) return null;
  const rows = await adminSelect<Record<string, unknown>[]>(t.path);
  return { csv: toCSV(t.cols, rows.map((r) => t.cols.map((c) => r[c]))), file: t.file };
}
