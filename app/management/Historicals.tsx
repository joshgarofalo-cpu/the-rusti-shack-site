"use client";

import { useMemo, useState } from "react";

type M = { ym: string; sales_rev: number; sales_cost: number; rental_rev: number };
const kMoney = (n: number) => (n >= 1000 ? "$" + (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k" : "$" + Math.round(n));
const money = (n: number) => "$" + Math.round(n).toLocaleString();
const monthLabel = (ym: string) => new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });

function LineChart({ rows }: { rows: { ym: string; rev: number; margin: number }[] }) {
  const W = 860, H = 300, padL = 56, padR = 14, padT = 14, padB = 30;
  const n = rows.length;
  const x = (i: number) => padL + (n > 1 ? i / (n - 1) : 0.5) * (W - padL - padR);
  const maxV = Math.max(...rows.map((r) => r.rev), 1);
  const y = (v: number) => padT + (1 - v / maxV) * (H - padT - padB);
  const line = (key: "rev" | "margin") => rows.map((r, i) => `${x(i).toFixed(1)},${y(r[key]).toFixed(1)}`).join(" ");
  const ticks = [0, 0.5, 1].map((f) => f * maxV);
  const every = Math.max(1, Math.round(n / 8));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="fc-chart" role="img" aria-label="Revenue and margin by month">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className="fc-grid" />
          <text x={padL - 8} y={y(t) + 4} className="fc-ytick">{kMoney(t)}</text>
        </g>
      ))}
      <polyline points={line("rev")} className="hc-rev" />
      <polyline points={line("margin")} className="hc-margin" />
      {rows.map((r, i) => (i % every === 0 || i === n - 1) ? (
        <text key={i} x={x(i)} y={H - 8} className="fc-xtick" textAnchor="middle">{monthLabel(r.ym)}</text>
      ) : null)}
    </svg>
  );
}

export default function Historicals({ monthly }: { monthly: M[] }) {
  const years = useMemo(() => [...new Set(monthly.map((m) => m.ym.slice(0, 4)))].sort(), [monthly]);
  const [year, setYear] = useState<string>("all");

  const rows = useMemo(
    () => monthly
      .filter((m) => year === "all" || m.ym.startsWith(year))
      .map((m) => ({ ym: m.ym, rev: m.sales_rev, margin: m.sales_rev - m.sales_cost })),
    [monthly, year]
  );

  const totRev = rows.reduce((s, r) => s + r.rev, 0);
  const totMargin = rows.reduce((s, r) => s + r.margin, 0);
  const marginPct = totRev ? (totMargin / totRev) * 100 : 0;

  // Year-over-year for the takeaway title.
  const yearTotal = (yy: string) => monthly.filter((m) => m.ym.startsWith(yy)).reduce((s, m) => s + m.sales_rev, 0);
  let title: string;
  if (year === "all") {
    const full = years.filter((yy) => monthly.filter((m) => m.ym.startsWith(yy)).length >= 12);
    const grew = full.length >= 2 ? yearTotal(full[full.length - 1]) / (yearTotal(full[0]) || 1) : 0;
    title = `Across ${years.length} years: ${money(totRev)} sold, ${money(totMargin)} kept (${marginPct.toFixed(0)}% margin)` +
      (grew ? ` — annual sales grew ${grew.toFixed(1)}× from ${full[0]} to ${full[full.length - 1]}` : "");
  } else {
    const prev = String(+year - 1);
    const yoy = years.includes(prev) && yearTotal(prev) ? ((yearTotal(year) - yearTotal(prev)) / yearTotal(prev)) * 100 : null;
    title = `${year}: ${money(totRev)} sold, ${money(totMargin)} kept (${marginPct.toFixed(0)}% margin)` +
      (yoy != null ? ` — ${yoy >= 0 ? "up" : "down"} ${Math.abs(yoy).toFixed(0)}% on ${prev}` : "");
  }

  return (
    <section className="mgr__section">
      <div className="fc-head">
        <div>
          <h2 className="mgr__h2" style={{ margin: 0 }}>{title}</h2>
          <p className="mgr__lead" style={{ margin: "4px 0 0" }}>
            Monthly revenue (what you sold) vs. margin (what you kept after cost).
          </p>
        </div>
      </div>
      <div className="hc-slicer" role="group" aria-label="Filter by year">
        <button className={`hc-year ${year === "all" ? "is-active" : ""}`} onClick={() => setYear("all")}>All years</button>
        {years.map((yy) => (
          <button key={yy} className={`hc-year ${year === yy ? "is-active" : ""}`} onClick={() => setYear(yy)}>{yy}</button>
        ))}
      </div>
      <LineChart rows={rows} />
      <div className="fc-legend">
        <span><i className="fc-sw" style={{ background: "var(--teal)" }} /> Revenue</span>
        <span><i className="fc-sw" style={{ background: "var(--navy)" }} /> Margin (kept)</span>
        <span className="fc-legend__note">{marginPct.toFixed(0)}% of revenue kept as margin</span>
      </div>
    </section>
  );
}
