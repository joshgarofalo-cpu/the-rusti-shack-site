"use client";

import { useMemo, useState } from "react";

export type InvRow = { sku: string; name: string; category: string; on_hand: number; demand_365: number };

// Reorder-point method (classic): ROP = demand over lead time + safety stock.
const LEAD_DAYS = 14; // island resupply from the mainland / abroad
const Z = 1.65; // ~95% service level

function compute(r: InvRow) {
  const daily = r.demand_365 / 365;
  const safety = Z * Math.sqrt(LEAD_DAYS * Math.max(daily, 0)); // Poisson approx of demand std
  const rop = Math.round(daily * LEAD_DAYS + safety);
  const daysCover = daily > 0 ? r.on_hand / daily : Infinity;
  return { daily, rop, daysCover, needs: r.on_hand <= rop };
}

export default function InventoryPanel({ rows }: { rows: InvRow[] }) {
  const [info, setInfo] = useState(false);
  const ranked = useMemo(
    () => rows.map((r) => ({ ...r, ...compute(r) })).sort((a, b) => a.daysCover - b.daysCover),
    [rows]
  );
  const reorder = ranked.filter((r) => r.needs);
  const show = reorder.length ? reorder : ranked.slice(0, 6);

  return (
    <section className="mgr__section">
      <div className="fc-head">
        <div>
          <h2 className="mgr__h2" style={{ margin: 0 }}>
            {reorder.length
              ? `${reorder.length} product${reorder.length === 1 ? "" : "s"} at or below reorder point`
              : "Every product is above its reorder point"}
          </h2>
          <p className="mgr__lead" style={{ margin: "4px 0 0" }}>
            {reorder.length ? "Order these before you run dry." : "Closest to the line shown below."}
          </p>
        </div>
        <button className="fc-info" onClick={() => setInfo(true)} aria-label="How reorder points are set">ⓘ</button>
      </div>

      <div className="mgr__table-wrap">
        <table className="mgr__table">
          <thead>
            <tr><th>Product</th><th>Category</th><th className="right">On hand</th><th className="right">Demand/day</th><th className="right">Reorder at</th><th className="right">Days left</th><th>Status</th></tr>
          </thead>
          <tbody>
            {show.map((r) => (
              <tr key={r.sku}>
                <td>{r.name}</td>
                <td>{r.category}</td>
                <td className="right">{r.on_hand}</td>
                <td className="right">{r.daily.toFixed(1)}</td>
                <td className="right">{r.rop}</td>
                <td className="right">{Number.isFinite(r.daysCover) ? Math.round(r.daysCover) : "—"}</td>
                <td><span className={`badge ${r.needs ? "badge--rent" : "badge--both"}`}>{r.needs ? "Reorder" : "OK"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {info && (
        <div className="fc-modal" role="dialog" aria-modal="true" onClick={() => setInfo(false)}>
          <div className="fc-modal__box" onClick={(e) => e.stopPropagation()}>
            <div className="fc-modal__head">
              <h3>How reorder points are set</h3>
              <button onClick={() => setInfo(false)} aria-label="Close">✕</button>
            </div>
            <p>
              For each product we estimate <strong>average daily demand</strong> from the last 12 months
              (units sold plus units rented). The <strong>reorder point</strong> is the demand you&apos;d expect
              during a restock, plus a cushion:
            </p>
            <p className="fc-modal__err">
              reorder point = daily demand × {LEAD_DAYS}-day lead time + safety stock, where safety stock =
              {" "}{Z} × √(lead time × daily demand) — enough to hold a ~95% service level (rarely stocking out)
              while you wait for the boat. When on-hand falls to that line, it&apos;s time to order. &ldquo;Days left&rdquo;
              is on-hand ÷ daily demand.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
