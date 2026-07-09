import type { Metadata } from "next";
import { cookies } from "next/headers";
import { MANAGER_COOKIE, isAuthed, managerConfigured } from "../lib/manager-auth";
import { ManagerLogin, LogoutButton } from "./ManagerClient";
import {
  getTotals, getMonthly, getProducts, getCategories, getCustomerTypes,
  getRentalProducts, getLast7, getRecentOrders,
  byYear, seasonality, forecastSeries,
} from "../lib/management";
import ForecastStudio from "./ForecastStudio";
import Historicals from "./Historicals";
import InventoryPanel from "./InventoryPanel";
import { getInventory } from "../lib/management";

export const dynamic = "force-dynamic";

// Private back office: keep it out of search engines (and it's in no nav).
export const metadata: Metadata = {
  title: "Management — The Rusti Shack",
  robots: { index: false, follow: false },
};

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const money2 = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const pct = (n: number) => `${n.toFixed(0)}%`;

function Bars({ rows, max, fmt }: { rows: { label: string; value: number; sub?: string }[]; max: number; fmt: (n: number) => string }) {
  return (
    <div className="mbars">
      {rows.map((r) => (
        <div className="mbar" key={r.label}>
          <span className="mbar__label">{r.label}</span>
          <div className="mbar__track"><div className="mbar__fill" style={{ width: `${max ? (r.value / max) * 100 : 0}%` }} /></div>
          <span className="mbar__val">{r.sub ?? fmt(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default async function ManagementPage() {
  const cookie = (await cookies()).get(MANAGER_COOKIE)?.value;
  if (!isAuthed(cookie)) return <ManagerLogin configured={managerConfigured()} />;

  // Part B basics (no views needed)
  const [last7, recentOrders] = await Promise.all([getLast7(), getRecentOrders(12)]);

  // Analytics from the views — degrade gracefully if they aren't created yet.
  let A: {
    totals: Awaited<ReturnType<typeof getTotals>>;
    monthly: Awaited<ReturnType<typeof getMonthly>>;
    products: Awaited<ReturnType<typeof getProducts>>;
    categories: Awaited<ReturnType<typeof getCategories>>;
    custTypes: Awaited<ReturnType<typeof getCustomerTypes>>;
    rentalProducts: Awaited<ReturnType<typeof getRentalProducts>>;
  } | null = null;
  try {
    const [totals, monthly, products, categories, custTypes, rentalProducts] = await Promise.all([
      getTotals(), getMonthly(), getProducts(), getCategories(), getCustomerTypes(), getRentalProducts(),
    ]);
    A = { totals, monthly, products, categories, custTypes, rentalProducts };
  } catch {
    A = null;
  }

  // Inventory view (separate — may not exist until partc-inventory.sql is run).
  let inventory: Awaited<ReturnType<typeof getInventory>> | null = null;
  try { inventory = await getInventory(); } catch { inventory = null; }

  const revSeries = A ? forecastSeries(A.monthly) : [];
  const years = A ? byYear(A.monthly) : [];
  const season = A ? seasonality(A.monthly) : [];
  const topMargin = A ? [...A.products].sort((a, b) => b.margin - a.margin).slice(0, 6) : [];
  const thin = A
    ? [...A.products].filter((p) => p.units >= 20).sort((a, b) => a.margin / a.revenue - b.margin / b.revenue).slice(0, 6)
    : [];

  return (
    <main className="mgr">
      <div className="container">
        <div className="mgr__head">
          <div>
            <span className="eyebrow">Back office</span>
            <h1>Store dashboard</h1>
          </div>
          <LogoutButton />
        </div>

        {/* Headline stats — last 7 days (Part B) + all-time */}
        <div className="mgr__stats">
          <div className="mgr__stat">
            <span className="mgr__stat-label">Orders · last 7 days</span>
            <span className="mgr__stat-value">{last7.orders}</span>
          </div>
          <div className="mgr__stat">
            <span className="mgr__stat-label">Revenue · last 7 days</span>
            <span className="mgr__stat-value">{money2(last7.revenue)}</span>
          </div>
          {A && <>
            <div className="mgr__stat">
              <span className="mgr__stat-label">Sales revenue · all time</span>
              <span className="mgr__stat-value">{money(A.totals.sales_revenue)}</span>
              <span className="mgr__stat-sub">margin {money(A.totals.sales_margin)} ({pct(A.totals.line_revenue ? (A.totals.sales_margin / A.totals.line_revenue) * 100 : 0)})</span>
            </div>
            <div className="mgr__stat">
              <span className="mgr__stat-label">Rental revenue · all time</span>
              <span className="mgr__stat-value">{money(A.totals.rental_revenue)}</span>
              <span className="mgr__stat-sub">{pct(A.totals.line_revenue ? (A.totals.rental_revenue / A.totals.line_revenue) * 100 : 0)} of sales</span>
            </div>
            <div className="mgr__stat">
              <span className="mgr__stat-label">Orders · all time</span>
              <span className="mgr__stat-value">{A.totals.orders.toLocaleString()}</span>
            </div>
            <div className="mgr__stat">
              <span className="mgr__stat-label">Customers</span>
              <span className="mgr__stat-value">{A.totals.customers.toLocaleString()}</span>
            </div>
          </>}
        </div>

        {/* Downloads (Part B) */}
        <div className="mgr__downloads">
          <a href="/api/management/export" className="btn btn--primary">⬇ Download sales (CSV)</a>
          <div className="mgr__raw">
            <span>Raw tables:</span>
            <a href="/api/management/export?table=orders">Orders</a>
            <a href="/api/management/export?table=orderlines">OrderLines</a>
            <a href="/api/management/export?table=rentals">Rentals</a>
            <a href="/api/management/export?table=customers_core">Customers_Core</a>
            <a href="/api/management/export?table=customers_contact">Customers_Contact</a>
          </div>
        </div>

        {!A && (
          <p className="mgr__notice">
            Analytics views aren&apos;t created yet. Run <code>supabase/partc-views.sql</code> in
            the Supabase SQL editor and reload. (Live stats + downloads above still work.)
          </p>
        )}

        {A && (
          <>
            {/* Historicals (year slicer) + forecasting studio — the heart of the back office */}
            <Historicals monthly={A.monthly} />
            <ForecastStudio series={revSeries} />

            {/* Revenue by year — sales vs rentals (helping or cannibalizing?) */}
            <section className="mgr__section">
              <h2 className="mgr__h2">Sales vs rentals, by year</h2>
              <p className="mgr__lead">Do the two rise together (complementary) or trade off (cannibalizing)? Bars are yearly revenue.</p>
              <div className="mgr__two">
                <div>
                  <div className="mgr__mini">Sales</div>
                  <Bars rows={years.map((y) => ({ label: String(y.year), value: y.sales }))} max={Math.max(...years.map((y) => y.sales), 1)} fmt={money} />
                </div>
                <div>
                  <div className="mgr__mini">Rentals</div>
                  <Bars rows={years.map((y) => ({ label: String(y.year), value: y.rental }))} max={Math.max(...years.map((y) => y.rental), 1)} fmt={money} />
                </div>
              </div>
            </section>

            {/* Seasonality */}
            <section className="mgr__section">
              <h2 className="mgr__h2">How the seasons move</h2>
              <p className="mgr__lead">Average sales revenue by calendar month, across all years.</p>
              <Bars rows={season.map((s) => ({ label: s.month, value: s.avg }))} max={Math.max(...season.map((s) => s.avg), 1)} fmt={money} />
            </section>

            {/* Margins */}
            <section className="mgr__section">
              <h2 className="mgr__h2">What earns its keep</h2>
              <div className="mgr__two">
                <div>
                  <div className="mgr__mini">Top products by margin</div>
                  <div className="mgr__table-wrap">
                    <table className="mgr__table">
                      <thead><tr><th>Product</th><th className="right">Units</th><th className="right">Margin</th></tr></thead>
                      <tbody>{topMargin.map((p) => (
                        <tr key={p.sku}><td>{p.name}</td><td className="right">{p.units.toLocaleString()}</td><td className="right">{money(p.margin)}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <div className="mgr__mini">Busy but thin margins (watch)</div>
                  <div className="mgr__table-wrap">
                    <table className="mgr__table">
                      <thead><tr><th>Product</th><th className="right">Units</th><th className="right">Margin %</th></tr></thead>
                      <tbody>{thin.map((p) => (
                        <tr key={p.sku}><td>{p.name}</td><td className="right">{p.units.toLocaleString()}</td><td className="right">{pct(p.revenue ? (p.margin / p.revenue) * 100 : 0)}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

            {/* Category + customers */}
            <section className="mgr__section">
              <div className="mgr__two">
                <div>
                  <h2 className="mgr__h2">By category</h2>
                  <div className="mgr__table-wrap">
                    <table className="mgr__table">
                      <thead><tr><th>Category</th><th className="right">Revenue</th><th className="right">Margin</th><th className="right">Margin %</th></tr></thead>
                      <tbody>{A.categories.map((c) => (
                        <tr key={c.category}><td>{c.category}</td><td className="right">{money(c.revenue)}</td><td className="right">{money(c.margin)}</td><td className="right">{pct(c.revenue ? (c.margin / c.revenue) * 100 : 0)}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <h2 className="mgr__h2">Who buys</h2>
                  <div className="mgr__table-wrap">
                    <table className="mgr__table">
                      <thead><tr><th>Customer type</th><th className="right">Customers</th><th className="right">Orders</th><th className="right">Revenue</th></tr></thead>
                      <tbody>{A.custTypes.map((c) => (
                        <tr key={c.type}><td>{c.type}</td><td className="right">{c.customers.toLocaleString()}</td><td className="right">{c.orders.toLocaleString()}</td><td className="right">{money(c.revenue)}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Inventory / reorder */}
        {inventory && inventory.length > 0 && <InventoryPanel rows={inventory} />}

        {/* Recent orders (Part B) */}
        <h2 className="mgr__h2">Recent orders</h2>
        {recentOrders.length === 0 ? (
          <p className="mgr__empty">No orders yet.</p>
        ) : (
          <div className="mgr__table-wrap">
            <table className="mgr__table">
              <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Country</th><th className="right">Total</th></tr></thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.OrderID}>
                    <td className="mono">{o.OrderID}</td>
                    <td>{o.OrderDate}</td>
                    <td>{o.name}</td>
                    <td>{o.country}</td>
                    <td className="right">{money2(o.OrderTotal || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
