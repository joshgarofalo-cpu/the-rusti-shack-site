import { adminSelectAll } from "./supabase-admin";

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

/** Headline export: one row per item sold, joined server-side in a view. */
export async function salesCSV(): Promise<string> {
  const headers = [
    "OrderID", "OrderDate", "FirstName", "LastName", "Country",
    "ProductCode", "ProductName", "Quantity", "UnitPrice", "LineRevenue",
    "ShippingFee", "OrderTotal", "PaymentMethod",
  ];
  const rows = await adminSelectAll<Record<string, unknown>>(
    `v_mgmt_sales_export?select=${headers.join(",")}&order=OrderID`
  );
  return toCSV(headers, rows.map((r) => headers.map((h) => r[h])));
}

/* ---------- Raw per-table exports (the "everything" downloads) ---------- */
const TABLES: Record<string, { path: string; cols: string[]; file: string }> = {
  orders: {
    path: "Orders?order=OrderID",
    cols: ["OrderID", "OrderDate", "CustID", "LocationID", "SalesAssociate", "Channel", "ShippingFee", "OrderTotal", "PaymentMethod"],
    file: "orders.csv",
  },
  orderlines: {
    path: "OrderLines?order=OrderID,LineNumber",
    cols: ["OrderID", "LineNumber", "ProductCode", "Quantity", "UnitPrice", "DiscountPct", "LineRevenue", "LineCost", "EffectiveDiscountAmount"],
    file: "order-lines.csv",
  },
  rentals: {
    path: "RentalTransactions?order=RentalID",
    cols: ["RentalID", "RentalDate", "CustID", "LocationID", "SalesAssociate", "SKU", "Quantity", "DailyRate", "RentalRevenue", "Returned"],
    file: "rentals.csv",
  },
  customers_core: {
    path: "Customers_Core?order=CustomerID",
    cols: ["CustomerID", "FirstName", "LastName", "CustomerType", "JoinDate", "City", "Country"],
    file: "customers-core.csv",
  },
  customers_contact: {
    path: "Customers_Contact?order=CustomerID",
    cols: ["CustomerID", "Email", "Phone", "LoyaltyMember", "StreetAddress", "Region", "PostalCode"],
    file: "customers-contact.csv",
  },
};

export async function tableCSV(
  key: string
): Promise<{ csv: string; file: string } | null> {
  const t = TABLES[key];
  if (!t) return null;
  const sep = t.path.includes("?") ? "&" : "?";
  const rows = await adminSelectAll<Record<string, unknown>>(
    `${t.path}${sep}select=${t.cols.join(",")}`
  );
  return { csv: toCSV(t.cols, rows.map((r) => t.cols.map((c) => r[c]))), file: t.file };
}
