import type { Metadata } from "next";
import { cookies } from "next/headers";
import { MANAGER_COOKIE, isAuthed, managerConfigured } from "../lib/manager-auth";
import { ManagerLogin, LogoutButton } from "./ManagerClient";
import {
  getMonthly, getCustomerTypes, getRecentOrders, getLast7,
  getInventory, getProductYear, getCustomerYear,
  forecastSeries, completeMonths,
} from "../lib/management";
import ForecastStudio from "./ForecastStudio";
import Dashboard from "./Dashboard";
import InventoryPanel from "./InventoryPanel";
import Assistant from "./Assistant";

export const dynamic = "force-dynamic";

// Private back office: keep it out of search engines (and it's in no nav).
export const metadata: Metadata = {
  title: "Management — The Rusti Shack",
  robots: { index: false, follow: false },
};

const money2 = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function ManagementPage() {
  const cookie = (await cookies()).get(MANAGER_COOKIE)?.value;
  if (!isAuthed(cookie)) return <ManagerLogin configured={managerConfigured()} />;

  // Part B basics (no views needed)
  const [last7, recentOrders] = await Promise.all([getLast7(), getRecentOrders(12)]);

  // Core analytics (monthly + customer mix) — degrade gracefully if views missing.
  let monthly: Awaited<ReturnType<typeof getMonthly>> = [];
  let custTypes: Awaited<ReturnType<typeof getCustomerTypes>> = [];
  try { [monthly, custTypes] = await Promise.all([getMonthly(), getCustomerTypes()]); } catch { /* views not created */ }

  // Year-tagged breakdowns (need partc-year-views.sql)
  let productYear: Awaited<ReturnType<typeof getProductYear>> = [];
  let customerYear: Awaited<ReturnType<typeof getCustomerYear>> = [];
  try { [productYear, customerYear] = await Promise.all([getProductYear(), getCustomerYear()]); } catch { /* year views not created */ }

  // Inventory view (needs partc-inventory.sql)
  let inventory: Awaited<ReturnType<typeof getInventory>> = [];
  try { inventory = await getInventory(); } catch { /* inventory view not created */ }

  const hasAnalytics = monthly.length > 0;
  const cleanMonthly = hasAnalytics ? completeMonths(monthly) : [];
  const revSeries = hasAnalytics ? forecastSeries(monthly) : [];

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

        {/* Live snapshot (Part B) */}
        <div className="mgr__stats" style={{ gridTemplateColumns: "repeat(2,1fr)", maxWidth: 560 }}>
          <div className="mgr__stat">
            <span className="mgr__stat-label">Orders · last 7 days</span>
            <span className="mgr__stat-value">{last7.orders}</span>
          </div>
          <div className="mgr__stat">
            <span className="mgr__stat-label">Revenue · last 7 days</span>
            <span className="mgr__stat-value">{money2(last7.revenue)}</span>
          </div>
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

        {/* Part D: ask-your-data assistant (private, read-only, grounded) */}
        <Assistant />

        {!hasAnalytics && (
          <p className="mgr__notice">
            Analytics views aren&apos;t created yet. Run <code>supabase/partc-views.sql</code> in
            the Supabase SQL editor and reload. (Live stats + downloads above still work.)
          </p>
        )}

        {/* Year-sliced analytics */}
        {hasAnalytics && (
          <Dashboard monthly={cleanMonthly} productYear={productYear} customerYear={customerYear} custTypeAll={custTypes} />
        )}

        {/* Forecasting studio (uses the full history) */}
        {hasAnalytics && <ForecastStudio series={revSeries} />}

        {/* Inventory / reorder */}
        {inventory.length > 0 && <InventoryPanel rows={inventory} />}

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
