import Link from "next/link";
import { getWebOrder } from "../../lib/webstore";
import { getProduct } from "../../lib/catalog";

export const metadata = { title: "Order confirmed — The Rusti Shack" };

export default async function ConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;
  const found = orderId ? await getWebOrder(orderId) : null;

  if (!found) {
    return (
      <main>
        <div className="container">
          <div className="cart-empty">
            <div style={{ fontSize: "3rem" }}>🐚</div>
            <h1>Order not found</h1>
            <p>We couldn&apos;t find that order. If you just checked out, try your link again.</p>
            <Link href="/shop" className="btn btn--primary">Back to the shop</Link>
          </div>
        </div>
      </main>
    );
  }

  const { order, lines } = found;

  return (
    <main>
      <div className="container">
        <div className="confirm">
          <div style={{ fontSize: "3rem" }}>🐢</div>
          <h1>Salamat! Your order&apos;s in.</h1>
          <p className="confirm__code">
            Order <strong>{order.OrderID}</strong> · {order.OrderDate}
          </p>
          <p className="confirm__note">
            Test mode — no payment was taken yet. Here&apos;s exactly what we recorded,
            in the same shape as the shop&apos;s books.
          </p>

          <div className="confirm__grid">
            <section className="confirm__card">
              <h2>Order</h2>
              <dl>
                <Row k="Channel" v={order.Channel} />
                <Row k="Location" v={order.LocationID} />
                <Row k="Rang up by" v={order.SalesAssociate} />
                <Row k="Payment" v={order.PaymentMethod} />
                <Row k="Customer" v={order.CustID} />
                <Row k="Shipping fee" v={`$${order.ShippingFee.toFixed(2)}`} />
                <Row k="Order total" v={`$${order.OrderTotal.toFixed(2)}`} strong />
              </dl>
            </section>

            <section className="confirm__card">
              <h2>Ship to</h2>
              <address className="confirm__addr">
                {order.ShipName}<br />
                {order.ShipStreet}<br />
                {order.ShipCity}{order.ShipRegion ? `, ${order.ShipRegion}` : ""} {order.ShipPostalCode}<br />
                {order.ShipCountry}
              </address>
            </section>
          </div>

          <section className="confirm__card">
            <h2>Items</h2>
            <table className="confirm__table">
              <thead>
                <tr><th>SKU</th><th>Item</th><th>Qty</th><th>Unit</th><th>Disc</th><th>Line</th></tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.LineNumber}>
                    <td>{l.ProductCode}</td>
                    <td>{getProduct(l.ProductCode)?.name ?? "—"}</td>
                    <td>{l.Quantity}</td>
                    <td>${l.UnitPrice.toFixed(2)}</td>
                    <td>{l.DiscountPct}%</td>
                    <td>${l.LineRevenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <Link href="/shop" className="btn btn--primary" style={{ marginTop: 8 }}>
            Keep browsing
          </Link>
        </div>
      </div>
    </main>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="confirm__row">
      <dt>{k}</dt>
      <dd style={strong ? { fontWeight: 800, color: "var(--navy)" } : undefined}>{v}</dd>
    </div>
  );
}
