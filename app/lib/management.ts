import { adminSelect } from "./supabase-admin";

export type Totals = {
  orders: number; sales_revenue: number; line_revenue: number;
  sales_margin: number; rental_revenue: number; customers: number;
};
export type Monthly = {
  ym: string; sales_rev: number; sales_cost: number; sales_units: number;
  orders: number; rental_rev: number; rental_units: number;
};
export type ProductRow = { sku: string; name: string; category: string; units: number; revenue: number; cost: number; margin: number };
export type CategoryRow = { category: string; units: number; revenue: number; cost: number; margin: number };
export type RentalProduct = { sku: string; name: string; category: string; units: number; revenue: number };
export type CustomerTypeRow = { type: string; customers: number; orders: number; revenue: number };
export type RecentOrder = { OrderID: string; OrderDate: string; OrderTotal: number; CustID: string; name: string; country: string };

export const getTotals = async () =>
  (await adminSelect<Totals[]>("v_mgmt_totals?select=*"))[0];
export const getMonthly = () =>
  adminSelect<Monthly[]>("v_mgmt_monthly?select=*&order=ym.asc");
export const getProducts = () =>
  adminSelect<ProductRow[]>("v_mgmt_product?select=*");
export const getCategories = () =>
  adminSelect<CategoryRow[]>("v_mgmt_category?select=*&order=revenue.desc");
export const getRentalProducts = () =>
  adminSelect<RentalProduct[]>("v_mgmt_rental_product?select=*&order=revenue.desc");
export const getCustomerTypes = () =>
  adminSelect<CustomerTypeRow[]>("v_mgmt_customer_type?select=*&order=revenue.desc");

export type InventoryRow = { sku: string; name: string; category: string; on_hand: number; rental_units: number; demand_365: number };
export const getInventory = () =>
  adminSelect<InventoryRow[]>("v_mgmt_inventory?select=*&order=name");

/** Part B: orders + revenue in the last 7 days (live view). */
export async function getLast7(): Promise<{ orders: number; revenue: number }> {
  const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const rows = await adminSelect<{ OrderTotal: number }[]>(
    `Orders?OrderDate=gte.${cutoff}&select=OrderTotal`
  );
  return { orders: rows.length, revenue: rows.reduce((s, r) => s + (r.OrderTotal || 0), 0) };
}

/** Part B: recent orders, newest first, with customer name + country. */
export async function getRecentOrders(limit = 12): Promise<RecentOrder[]> {
  const orders = await adminSelect<{ OrderID: string; OrderDate: string; OrderTotal: number; CustID: string }[]>(
    `Orders?select=OrderID,OrderDate,OrderTotal,CustID&order=OrderDate.desc,OrderID.desc&limit=${limit}`
  );
  const ids = [...new Set(orders.map((o) => o.CustID).filter(Boolean))];
  const custs = ids.length
    ? await adminSelect<{ CustomerID: string; FirstName: string; LastName: string; Country: string }[]>(
        `Customers_Core?CustomerID=in.(${ids.map(encodeURIComponent).join(",")})&select=CustomerID,FirstName,LastName,Country`
      )
    : [];
  const by = new Map(custs.map((c) => [c.CustomerID, c]));
  return orders.map((o) => {
    const c = by.get(o.CustID);
    return {
      ...o,
      name: c ? `${c.FirstName} ${c.LastName}`.trim() : o.CustID,
      country: c?.Country ?? "—",
    };
  });
}

/* ---------- Derived analytics (computed from the monthly series) ---------- */

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** Sales + rental revenue grouped by calendar year. */
export function byYear(monthly: Monthly[]) {
  const m = new Map<number, { sales: number; rental: number }>();
  for (const r of monthly) {
    const y = parseInt(r.ym.slice(0, 4));
    const cur = m.get(y) ?? { sales: 0, rental: 0 };
    cur.sales += r.sales_rev; cur.rental += r.rental_rev;
    m.set(y, cur);
  }
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([year, v]) => ({ year, ...v }));
}

/** Average sales revenue per calendar month (seasonality shape). */
export function seasonality(monthly: Monthly[]) {
  const buckets: number[][] = Array.from({ length: 12 }, () => []);
  for (const r of monthly) buckets[parseInt(r.ym.slice(5, 7)) - 1].push(r.sales_rev);
  return buckets.map((arr, i) => ({
    month: MONTHS[i],
    avg: arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0,
  }));
}

/** Drop the trailing partial/outlier month(s) — e.g. a just-started month with a
 *  single online order — so charts end on the last complete month of trading. */
export function completeMonths(monthly: Monthly[]): Monthly[] {
  let s = [...monthly];
  while (s.length > 13) {
    const last = s[s.length - 1].sales_rev;
    const w = s.slice(-13, -1).map((m) => m.sales_rev).sort((a, b) => a - b);
    const med = w[Math.floor(w.length / 2)] || 0;
    if (med > 0 && last < 0.25 * med) s = s.slice(0, -1);
    else break;
  }
  return s;
}

/** Monthly revenue series for the forecasting models (complete months only). */
export function forecastSeries(monthly: Monthly[]): { ym: string; value: number }[] {
  return completeMonths(monthly).map((m) => ({ ym: m.ym, value: m.sales_rev }));
}

export type Forecast = {
  growthPct: number;
  years: number;
  months: { label: string; sales: number; rental: number }[];
  salesTotal: number;
  rentalTotal: number;
};

/** Honest seasonal forecast: average each of the next 3 calendar months across
 *  prior years, nudged by the year-over-year growth trend. */
export function forecastNextQuarter(monthly: Monthly[]): Forecast {
  const salesByCal: number[][] = Array.from({ length: 12 }, () => []);
  const rentalByCal: number[][] = Array.from({ length: 12 }, () => []);
  const yearSales = new Map<number, number>();
  for (const r of monthly) {
    const mo = parseInt(r.ym.slice(5, 7)) - 1;
    const y = parseInt(r.ym.slice(0, 4));
    salesByCal[mo].push(r.sales_rev);
    rentalByCal[mo].push(r.rental_rev);
    yearSales.set(y, (yearSales.get(y) ?? 0) + r.sales_rev);
  }
  const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

  // YoY growth from complete calendar years (ignore partial first/last).
  const years = [...yearSales.keys()].sort();
  const full = years.filter((y) => monthly.filter((r) => r.ym.startsWith(String(y))).length >= 12);
  let growth = 0;
  if (full.length >= 2) {
    const first = yearSales.get(full[0])!;
    const last = yearSales.get(full[full.length - 1])!;
    const span = full[full.length - 1] - full[0];
    if (first > 0 && span > 0) growth = Math.pow(last / first, 1 / span) - 1;
  }
  growth = Math.max(-0.5, Math.min(0.5, growth)); // clamp to a sane range

  const now = new Date();
  const months: { label: string; sales: number; rental: number }[] = [];
  for (let k = 1; k <= 3; k++) {
    const d = new Date(now.getFullYear(), now.getMonth() + k, 1);
    const mo = d.getMonth();
    months.push({
      label: `${MONTHS[mo]} ${d.getFullYear()}`,
      sales: avg(salesByCal[mo]) * (1 + growth),
      rental: avg(rentalByCal[mo]) * (1 + growth),
    });
  }
  return {
    growthPct: growth * 100,
    years: full.length,
    months,
    salesTotal: months.reduce((s, m) => s + m.sales, 0),
    rentalTotal: months.reduce((s, m) => s + m.rental, 0),
  };
}
