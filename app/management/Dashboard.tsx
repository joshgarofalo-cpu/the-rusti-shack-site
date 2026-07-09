"use client";

import { useMemo, useState } from "react";
import type { Monthly, ProductYearRow, CustomerYearRow, CustomerTypeRow } from "../lib/management";

const money = (n: number) => "$" + Math.round(n).toLocaleString();
const kMoney = (n: number) => (n >= 1000 ? "$" + (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k" : "$" + Math.round(n));
const pct = (n: number) => `${n.toFixed(0)}%`;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const mLabel = (ym: string) => new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });

function LineChart({ rows }: { rows: { label: string; rev: number; margin: number }[] }) {
  const W = 860, H = 280, padL = 56, padR = 14, padT = 14, padB = 30;
  const n = rows.length;
  const x = (i: number) => padL + (n > 1 ? i / (n - 1) : 0.5) * (W - padL - padR);
  const maxV = Math.max(...rows.map((r) => r.rev), 1);
  const y = (v: number) => padT + (1 - v / maxV) * (H - padT - padB);
  const poly = (k: "rev" | "margin") => rows.map((r, i) => `${x(i).toFixed(1)},${y(r[k]).toFixed(1)}`).join(" ");
  const every = Math.max(1, Math.round(n / 8));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="fc-chart" role="img" aria-label="Revenue and margin">
      {[0, 0.5, 1].map((f, i) => (
        <g key={i}><line x1={padL} x2={W - padR} y1={y(f * maxV)} y2={y(f * maxV)} className="fc-grid" />
          <text x={padL - 8} y={y(f * maxV) + 4} className="fc-ytick">{kMoney(f * maxV)}</text></g>
      ))}
      <polyline points={poly("rev")} className="hc-rev" />
      <polyline points={poly("margin")} className="hc-margin" />
      {rows.map((r, i) => (i % every === 0 || i === n - 1) ? <text key={i} x={x(i)} y={H - 8} className="fc-xtick" textAnchor="middle">{r.label}</text> : null)}
    </svg>
  );
}

function Bars({ rows, max, fmt, active }: { rows: { label: string; value: number }[]; max: number; fmt: (n: number) => string; active?: string }) {
  return (
    <div className="mbars">
      {rows.map((r) => (
        <div className={`mbar ${active && r.label === active ? "mbar--on" : ""}`} key={r.label}>
          <span className="mbar__label">{r.label}</span>
          <div className="mbar__track"><div className="mbar__fill" style={{ width: `${max ? (r.value / max) * 100 : 0}%` }} /></div>
          <span className="mbar__val">{fmt(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

type Props = {
  monthly: Monthly[];
  productYear: ProductYearRow[];
  customerYear: CustomerYearRow[];
  custTypeAll: CustomerTypeRow[];
};

export default function Dashboard({ monthly, productYear, customerYear, custTypeAll }: Props) {
  const years = useMemo(() => [...new Set(monthly.map((m) => m.ym.slice(0, 4)))].sort(), [monthly]);
  const [year, setYear] = useState<string>("all");
  const isAll = year === "all";
  const label = isAll ? "all years" : year;

  // Monthly filtered to the selection
  const mSel = useMemo(() => monthly.filter((m) => isAll || m.ym.startsWith(year)), [monthly, year, isAll]);
  const kpi = useMemo(() => {
    const rev = mSel.reduce((s, m) => s + m.sales_rev, 0);
    const cost = mSel.reduce((s, m) => s + m.sales_cost, 0);
    const rentals = mSel.reduce((s, m) => s + m.rental_rev, 0);
    const orders = mSel.reduce((s, m) => s + m.orders, 0);
    return { rev, margin: rev - cost, rentals, orders, marginPct: rev ? ((rev - cost) / rev) * 100 : 0 };
  }, [mSel]);

  // Historicals: month labels within a year, else full timeline
  const histRows = mSel.map((m) => ({ label: mLabel(m.ym), rev: m.sales_rev, margin: m.sales_rev - m.sales_cost }));

  // Sales vs rentals by year (always shows the trend; selection is highlighted)
  const byYear = useMemo(() => {
    const map = new Map<string, { sales: number; rentals: number }>();
    for (const m of monthly) {
      const yy = m.ym.slice(0, 4);
      const c = map.get(yy) ?? { sales: 0, rentals: 0 };
      c.sales += m.sales_rev; c.rentals += m.rental_rev; map.set(yy, c);
    }
    return [...map.entries()].sort().map(([yy, v]) => ({ year: yy, ...v }));
  }, [monthly]);

  // Seasonality: this year's months, or the cross-year average
  const season = useMemo(() => {
    if (!isAll) return mSel.map((m) => ({ label: MONTHS[+m.ym.slice(5, 7) - 1], value: m.sales_rev }));
    const b: number[][] = Array.from({ length: 12 }, () => []);
    for (const m of monthly) b[+m.ym.slice(5, 7) - 1].push(m.sales_rev);
    return b.map((a, i) => ({ label: MONTHS[i], value: a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0 }));
  }, [monthly, mSel, isAll]);

  // Products (margins) for the selection
  const products = useMemo(() => {
    const rows = isAll ? productYear : productYear.filter((p) => String(p.yr) === year);
    const agg = new Map<string, { sku: string; name: string; category: string; units: number; revenue: number; margin: number }>();
    for (const r of rows) {
      const a = agg.get(r.sku) ?? { sku: r.sku, name: r.name, category: r.category, units: 0, revenue: 0, margin: 0 };
      a.units += r.units; a.revenue += r.revenue; a.margin += r.margin; agg.set(r.sku, a);
    }
    return [...agg.values()];
  }, [productYear, year, isAll]);
  const topMargin = [...products].sort((a, b) => b.margin - a.margin).slice(0, 6);
  const thin = [...products].filter((p) => p.units >= 15).sort((a, b) => a.margin / a.revenue - b.margin / b.revenue).slice(0, 6);

  const categories = useMemo(() => {
    const agg = new Map<string, { category: string; revenue: number; margin: number }>();
    for (const p of products) {
      const a = agg.get(p.category) ?? { category: p.category, revenue: 0, margin: 0 };
      a.revenue += p.revenue; a.margin += p.margin; agg.set(p.category, a);
    }
    return [...agg.values()].sort((a, b) => b.revenue - a.revenue);
  }, [products]);

  const custMix = useMemo(() => {
    if (isAll) return custTypeAll.map((c) => ({ type: c.type, customers: c.customers, orders: c.orders, revenue: c.revenue }));
    return customerYear.filter((c) => String(c.yr) === year).map((c) => ({ type: c.type, customers: c.customers, orders: c.orders, revenue: c.revenue }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [custTypeAll, customerYear, year, isAll]);

  const topCat = categories[0];
  const topProd = topMargin[0];
  const totalCustRev = custMix.reduce((s, c) => s + c.revenue, 0);
  const topCust = [...custMix].sort((a, b) => b.revenue - a.revenue)[0];

  return (
    <section className="mgr__section">
      {/* Page-wide year slicer */}
      <div className="hc-slicer" role="group" aria-label="Filter by year">
        <span className="dash-slicer-label">Year:</span>
        <button className={`hc-year ${isAll ? "is-active" : ""}`} onClick={() => setYear("all")}>All years</button>
        {years.map((yy) => <button key={yy} className={`hc-year ${year === yy ? "is-active" : ""}`} onClick={() => setYear(yy)}>{yy}</button>)}
      </div>

      {/* Year-aware KPIs */}
      <div className="mgr__stats" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="mgr__stat"><span className="mgr__stat-label">Revenue · {label}</span><span className="mgr__stat-value">{money(kpi.rev)}</span></div>
        <div className="mgr__stat"><span className="mgr__stat-label">Margin · {label}</span><span className="mgr__stat-value">{money(kpi.margin)}</span><span className="mgr__stat-sub">{pct(kpi.marginPct)} kept</span></div>
        <div className="mgr__stat"><span className="mgr__stat-label">Rentals · {label}</span><span className="mgr__stat-value">{money(kpi.rentals)}</span></div>
        <div className="mgr__stat"><span className="mgr__stat-label">Orders · {label}</span><span className="mgr__stat-value">{kpi.orders.toLocaleString()}</span></div>
      </div>

      {/* Historicals */}
      <div className="mgr__section">
        <h2 className="mgr__h2">
          {isAll
            ? `Revenue climbed to ${money(kpi.rev)} across ${years.length} years, keeping ${pct(kpi.marginPct)} as margin`
            : `${year}: ${money(kpi.rev)} sold, ${money(kpi.margin)} kept (${pct(kpi.marginPct)} margin)`}
        </h2>
        <p className="mgr__lead">Monthly revenue (what you sold) vs. margin (what you kept after cost).</p>
        <LineChart rows={histRows} />
        <div className="fc-legend">
          <span><i className="fc-sw" style={{ background: "var(--teal)" }} /> Revenue</span>
          <span><i className="fc-sw" style={{ background: "var(--navy)" }} /> Margin (kept)</span>
        </div>
      </div>

      {/* Sales vs rentals */}
      <div className="mgr__section">
        <h2 className="mgr__h2">
          {isAll
            ? "Rentals grow alongside sales — they add to the shop, not eat into it"
            : `${year}: ${money(kpi.rentals)} in rentals on top of ${money(kpi.rev)} in sales`}
        </h2>
        <div className="mgr__two">
          <div><div className="mgr__mini">Sales by year</div>
            <Bars rows={byYear.map((y) => ({ label: y.year, value: y.sales }))} max={Math.max(...byYear.map((y) => y.sales), 1)} fmt={money} active={isAll ? undefined : year} /></div>
          <div><div className="mgr__mini">Rentals by year</div>
            <Bars rows={byYear.map((y) => ({ label: y.year, value: y.rentals }))} max={Math.max(...byYear.map((y) => y.rentals), 1)} fmt={money} active={isAll ? undefined : year} /></div>
        </div>
      </div>

      {/* Seasonality */}
      <div className="mgr__section">
        <h2 className="mgr__h2">
          {isAll ? "The season swings hard — peak months run well above the quiet ones" : `${year} through the months`}
        </h2>
        <p className="mgr__lead">{isAll ? "Average sales revenue by calendar month, across all years." : "Sales revenue by month."}</p>
        <Bars rows={season} max={Math.max(...season.map((s) => s.value), 1)} fmt={money} />
      </div>

      {/* Margins */}
      {products.length > 0 && (
      <div className="mgr__section">
        <h2 className="mgr__h2">{topProd ? `${topProd.name} earned the most margin ${isAll ? "overall" : `in ${year}`} (${money(topProd.margin)})` : "Margins"}</h2>
        <div className="mgr__two">
          <div><div className="mgr__mini">Top products by margin</div>
            <div className="mgr__table-wrap"><table className="mgr__table"><thead><tr><th>Product</th><th className="right">Units</th><th className="right">Margin</th></tr></thead>
              <tbody>{topMargin.map((p) => <tr key={p.sku}><td>{p.name}</td><td className="right">{p.units.toLocaleString()}</td><td className="right">{money(p.margin)}</td></tr>)}</tbody></table></div></div>
          <div><div className="mgr__mini">Busy but thin margins (watch)</div>
            <div className="mgr__table-wrap"><table className="mgr__table"><thead><tr><th>Product</th><th className="right">Units</th><th className="right">Margin %</th></tr></thead>
              <tbody>{thin.map((p) => <tr key={p.sku}><td>{p.name}</td><td className="right">{p.units.toLocaleString()}</td><td className="right">{pct(p.revenue ? (p.margin / p.revenue) * 100 : 0)}</td></tr>)}</tbody></table></div></div>
        </div>
      </div>
      )}

      {/* Category + customers */}
      <div className="mgr__section">
        <div className="mgr__two">
          {categories.length > 0 && (
          <div>
            <h2 className="mgr__h2">{topCat ? `${topCat.category} led ${isAll ? "overall" : year}` : "By category"}</h2>
            <div className="mgr__table-wrap"><table className="mgr__table"><thead><tr><th>Category</th><th className="right">Revenue</th><th className="right">Margin</th><th className="right">Margin %</th></tr></thead>
              <tbody>{categories.map((c) => <tr key={c.category}><td>{c.category}</td><td className="right">{money(c.revenue)}</td><td className="right">{money(c.margin)}</td><td className="right">{pct(c.revenue ? (c.margin / c.revenue) * 100 : 0)}</td></tr>)}</tbody></table></div>
          </div>
          )}
          {custMix.length > 0 && (
          <div>
            <h2 className="mgr__h2">{topCust ? `${topCust.type} customers drove ${pct(totalCustRev ? (topCust.revenue / totalCustRev) * 100 : 0)} of ${isAll ? "all" : year} revenue` : "Who buys"}</h2>
            <div className="mgr__table-wrap"><table className="mgr__table"><thead><tr><th>Customer type</th><th className="right">Customers</th><th className="right">Orders</th><th className="right">Revenue</th></tr></thead>
              <tbody>{custMix.map((c) => <tr key={c.type}><td>{c.type}</td><td className="right">{c.customers.toLocaleString()}</td><td className="right">{c.orders.toLocaleString()}</td><td className="right">{money(c.revenue)}</td></tr>)}</tbody></table></div>
          </div>
          )}
        </div>
      </div>

      {products.length === 0 && (
        <p className="mgr__notice">
          Per-product, category, and customer breakdowns by year need{" "}
          <code>supabase/partc-year-views.sql</code>. The stats, historicals, sales-vs-rentals,
          and seasonality above already respond to the year slicer.
        </p>
      )}
    </section>
  );
}
