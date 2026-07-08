import type { Metadata } from "next";
import { cookies } from "next/headers";
import { MANAGER_COOKIE, isAuthed, managerConfigured } from "../lib/manager-auth";
import { fetchManagerData } from "../lib/reports";
import { ManagerLogin, LogoutButton } from "./ManagerClient";

export const dynamic = "force-dynamic";

// Private back-office page: keep it out of search engines (and it's not in any nav).
export const metadata: Metadata = {
  title: "Manager — The Rusti Shack",
  robots: { index: false, follow: false },
};

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function ManagerPage() {
  const cookie = (await cookies()).get(MANAGER_COOKIE)?.value;
  if (!isAuthed(cookie)) {
    return <ManagerLogin configured={managerConfigured()} />;
  }

  const { orders, lines, core, productName } = await fetchManagerData();
  const custById = new Map(core.map((c) => [c.CustomerID, c]));

  // Last 7 days
  const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const recent7 = orders.filter((o) => o.OrderDate >= cutoff);
  const revenue7 = recent7.reduce((s, o) => s + (o.OrderTotal || 0), 0);

  // Best seller by units
  const qtyBySku = new Map<string, number>();
  for (const l of lines) {
    qtyBySku.set(l.ProductCode, (qtyBySku.get(l.ProductCode) || 0) + l.Quantity);
  }
  let bestSku = "";
  let bestQty = 0;
  for (const [sku, q] of qtyBySku) {
    if (q > bestQty) { bestQty = q; bestSku = sku; }
  }
  const bestSeller = bestSku ? (productName.get(bestSku) ?? bestSku) : "—";

  const recentOrders = orders.slice(0, 25);

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

        {/* Headline stats */}
        <div className="mgr__stats">
          <div className="mgr__stat">
            <span className="mgr__stat-label">Orders · last 7 days</span>
            <span className="mgr__stat-value">{recent7.length}</span>
          </div>
          <div className="mgr__stat">
            <span className="mgr__stat-label">Revenue · last 7 days</span>
            <span className="mgr__stat-value">{money(revenue7)}</span>
          </div>
          <div className="mgr__stat">
            <span className="mgr__stat-label">Best seller</span>
            <span className="mgr__stat-value mgr__stat-value--sm">{bestSeller}</span>
            {bestQty > 0 && <span className="mgr__stat-sub">{bestQty} sold</span>}
          </div>
        </div>

        {/* Downloads */}
        <div className="mgr__downloads">
          <a href="/api/manager/export" className="btn btn--primary">⬇ Download sales (CSV)</a>
          <div className="mgr__raw">
            <span>Raw tables:</span>
            <a href="/api/manager/export?table=orders">Orders</a>
            <a href="/api/manager/export?table=orderlines">OrderLines</a>
            <a href="/api/manager/export?table=customers_core">Customers_Core</a>
            <a href="/api/manager/export?table=customers_contact">Customers_Contact</a>
          </div>
        </div>

        {/* Recent orders */}
        <h2 className="mgr__h2">Recent orders</h2>
        {recentOrders.length === 0 ? (
          <p className="mgr__empty">No orders yet — they&apos;ll appear here as they come in.</p>
        ) : (
          <div className="mgr__table-wrap">
            <table className="mgr__table">
              <thead>
                <tr>
                  <th>Order</th><th>Date</th><th>Customer</th><th>Country</th><th className="right">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => {
                  const c = custById.get(o.CustID);
                  return (
                    <tr key={o.OrderID}>
                      <td className="mono">{o.OrderID}</td>
                      <td>{o.OrderDate}</td>
                      <td>{c ? `${c.FirstName} ${c.LastName}` : o.CustID}</td>
                      <td>{c?.Country ?? "—"}</td>
                      <td className="right">{money(o.OrderTotal || 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
