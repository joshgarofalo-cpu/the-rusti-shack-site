"use client";

import { useState } from "react";

type Chart = { title: string; chartType: "bar" | "line"; rows: { label: string; value: number }[] };
type Exchange = { question: string; answer: string; chart: Chart | null };

const EXAMPLES = [
  "Which kind of customer spends the most?",
  "Which products tend to sell together?",
  "How did 2025 compare to 2024?",
  "What should I reorder?",
  "Top products by margin",
];

const isMoney = (title: string) => /revenue|margin|sales|spend|rental/i.test(title);
const fmt = (v: number, money: boolean) => (money ? "$" + Math.round(v).toLocaleString() : v.toLocaleString());

function BarChart({ chart }: { chart: Chart }) {
  const money = isMoney(chart.title);
  const max = Math.max(...chart.rows.map((r) => Math.abs(r.value)), 1);
  return (
    <div className="mbars ai-bars">
      {chart.rows.map((r, i) => (
        <div className="mbar" key={i}>
          <span className="mbar__label ai-bar-label">{r.label}</span>
          <div className="mbar__track"><div className="mbar__fill" style={{ width: `${(Math.abs(r.value) / max) * 100}%` }} /></div>
          <span className="mbar__val">{fmt(r.value, money)}</span>
        </div>
      ))}
    </div>
  );
}

function LineChart({ chart }: { chart: Chart }) {
  const W = 820, H = 240, padL = 56, padR = 14, padT = 12, padB = 28;
  const rows = chart.rows;
  const n = rows.length;
  const money = isMoney(chart.title);
  const x = (i: number) => padL + (n > 1 ? i / (n - 1) : 0.5) * (W - padL - padR);
  const max = Math.max(...rows.map((r) => r.value), 1);
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);
  const line = rows.map((r, i) => `${x(i).toFixed(1)},${y(r.value).toFixed(1)}`).join(" ");
  const every = Math.max(1, Math.round(n / 8));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="fc-chart" role="img" aria-label={chart.title}>
      {[0, 0.5, 1].map((f, i) => (
        <g key={i}><line x1={padL} x2={W - padR} y1={y(f * max)} y2={y(f * max)} className="fc-grid" />
          <text x={padL - 8} y={y(f * max) + 4} className="fc-ytick">{money ? "$" + Math.round(f * max / 1000) + "k" : Math.round(f * max)}</text></g>
      ))}
      <polyline points={line} className="hc-rev" />
      {rows.map((r, i) => (i % every === 0 || i === n - 1) ? <text key={i} x={x(i)} y={H - 8} className="fc-xtick" textAnchor="middle">{r.label}</text> : null)}
    </svg>
  );
}

export default function Assistant() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Exchange[]>([]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true); setError(null); setQ("");
    try {
      const res = await fetch("/api/management/ask", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: text }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); }
      else setHistory((h) => [{ question: text, answer: data.answer, chart: data.chart }, ...h]);
    } catch { setError("Couldn't reach the assistant."); }
    setBusy(false);
  }

  return (
    <section className="mgr__section ai">
      <div className="ai__head">
        <h2 className="mgr__h2" style={{ margin: 0 }}>Ask your data</h2>
        <span className="ai__badge">Private · read-only · your data only</span>
      </div>
      <p className="mgr__lead" style={{ marginTop: 4 }}>Ask in plain English — you&apos;ll get an answer grounded in your own numbers, with a chart.</p>

      <form className="ai__form" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Which products sell together?" maxLength={500} aria-label="Ask a question" />
        <button className="btn btn--primary" disabled={busy || !q.trim()}>{busy ? "Thinking…" : "Ask"}</button>
      </form>

      <div className="ai__examples">
        {EXAMPLES.map((e) => <button key={e} className="ai__chip" onClick={() => ask(e)} disabled={busy}>{e}</button>)}
      </div>

      {error && <p className="checkout__error" role="alert">{error}</p>}

      <div className="ai__thread">
        {busy && <div className="ai__card ai__card--wait">Looking through your data…</div>}
        {history.map((x, i) => (
          <div className="ai__card" key={i}>
            <div className="ai__q">{x.question}</div>
            <div className="ai__a">{x.answer}</div>
            {x.chart && x.chart.rows.length > 0 && (
              <div className="ai__chart">
                <div className="mgr__mini">{x.chart.title}</div>
                {x.chart.chartType === "line" ? <LineChart chart={x.chart} /> : <BarChart chart={x.chart} />}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
