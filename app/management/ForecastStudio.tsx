"use client";

import { useMemo, useState } from "react";
import { runModel, MODEL_INFO, type ModelKey, type SeriesPoint, type ChartPoint } from "../lib/forecast";

const MODELS: ModelKey[] = ["seasonal", "linear", "holt"];
const kMoney = (n: number) =>
  n >= 1000 ? "$" + (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k" : "$" + Math.round(n);
const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
};

function Chart({ points }: { points: ChartPoint[] }) {
  const W = 860, H = 340, padL = 56, padR = 14, padT = 16, padB = 30;
  const n = points.length;
  const x = (i: number) => padL + (n > 1 ? i / (n - 1) : 0) * (W - padL - padR);
  const vals = points.flatMap((p) => [p.actual, p.mean, p.lower, p.upper].filter((v): v is number => v != null));
  const maxV = Math.max(...vals, 1);
  const y = (v: number) => padT + (1 - v / maxV) * (H - padT - padB);

  let nowI = 0;
  points.forEach((p, i) => { if (p.actual != null) nowI = i; });

  const band = points.map((p, i) => ({ p, i })).filter((o) => o.p.upper != null && o.p.lower != null);
  const bandPath = band.length
    ? "M " + band.map((o) => `${x(o.i).toFixed(1)},${y(o.p.upper!).toFixed(1)}`).join(" L ") +
      " L " + [...band].reverse().map((o) => `${x(o.i).toFixed(1)},${y(o.p.lower!).toFixed(1)}`).join(" L ") + " Z"
    : "";
  const hist = points.map((p, i) => (p.actual != null ? `${x(i).toFixed(1)},${y(p.actual).toFixed(1)}` : null)).filter(Boolean).join(" ");
  const fc = points.map((p, i) => (p.mean != null ? `${x(i).toFixed(1)},${y(p.mean).toFixed(1)}` : null)).filter(Boolean).join(" ");

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxV);
  const xEvery = Math.max(1, Math.round(n / 8));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="fc-chart" role="img" aria-label="Revenue history and forecast">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className="fc-grid" />
          <text x={padL - 8} y={y(t) + 4} className="fc-ytick">{kMoney(t)}</text>
        </g>
      ))}
      {bandPath && <path d={bandPath} className="fc-band" />}
      {hist && <polyline points={hist} className="fc-hist" />}
      {fc && <polyline points={fc} className="fc-fore" />}
      <line x1={x(nowI)} x2={x(nowI)} y1={padT} y2={H - padB} className="fc-now" />
      {points.map((p, i) => (i % xEvery === 0 || i === n - 1) ? (
        <text key={i} x={x(i)} y={H - 8} className="fc-xtick" textAnchor="middle">{monthLabel(p.ym)}</text>
      ) : null)}
    </svg>
  );
}

export default function ForecastStudio({ series }: { series: SeriesPoint[] }) {
  const [model, setModel] = useState<ModelKey>("seasonal");
  const [horizon, setHorizon] = useState(6);
  const [info, setInfo] = useState(false);

  // MAPE per model (fixed horizon for the label) + the active run.
  const errByModel = useMemo(() => {
    const e = {} as Record<ModelKey, number>;
    for (const m of MODELS) e[m] = runModel(series, m, 1).mapePct;
    return e;
  }, [series]);
  const out = useMemo(() => runModel(series, model, horizon), [series, model, horizon]);

  const lastActual = [...out.points].reverse().find((p) => p.actual != null)?.actual ?? 0;
  const end = out.points[out.points.length - 1];
  const recent = series.slice(-12);
  const recentAvg = recent.reduce((s, p) => s + p.value, 0) / Math.max(1, recent.length);
  const dir = (end.mean ?? 0) >= recentAvg ? "climbing" : "easing";
  const info_ = MODEL_INFO[model];

  return (
    <section className="mgr__section">
      <div className="fc-head">
        <div>
          <h2 className="mgr__h2" style={{ margin: 0 }}>
            {info_.name}: revenue {dir} to ~{kMoney(end.mean ?? 0)}/mo by {monthLabel(end.ym)}
          </h2>
          <p className="mgr__lead" style={{ margin: "4px 0 0" }}>
            {horizon}-month outlook · typical error ±{out.mapePct.toFixed(0)}% · shaded band = ~80% likely range, widening with time.
          </p>
        </div>
        <button className="fc-info" onClick={() => setInfo(true)} aria-label="About this model">ⓘ</button>
      </div>

      <div className="fc-controls">
        <div className="fc-models" role="group" aria-label="Forecast model">
          {MODELS.map((m) => (
            <button key={m} className={`fc-model ${m === model ? "is-active" : ""}`} onClick={() => setModel(m)}>
              {MODEL_INFO[m].name}<span className="fc-model-err">±{errByModel[m].toFixed(0)}%</span>
            </button>
          ))}
        </div>
        <label className="fc-horizon">
          Horizon: <strong>{horizon} mo</strong>
          <input type="range" min={3} max={18} value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} />
        </label>
      </div>

      <Chart points={out.points} />

      <div className="fc-legend">
        <span><i className="fc-sw fc-sw--hist" /> Actual</span>
        <span><i className="fc-sw fc-sw--fore" /> Forecast</span>
        <span><i className="fc-sw fc-sw--band" /> Likely range</span>
        <span className="fc-legend__note">Last actual: {kMoney(lastActual)}/mo</span>
      </div>

      {info && (
        <div className="fc-modal" role="dialog" aria-modal="true" onClick={() => setInfo(false)}>
          <div className="fc-modal__box" onClick={(e) => e.stopPropagation()}>
            <div className="fc-modal__head">
              <h3>{info_.name}</h3>
              <button onClick={() => setInfo(false)} aria-label="Close">✕</button>
            </div>
            <p>{info_.blurb}</p>
            <p className="fc-modal__err">
              On your history this model is typically within <strong>±{out.mapePct.toFixed(0)}%</strong> per month.
              The shaded band shows an ~80% likely range and widens with the forecast horizon, since uncertainty
              compounds the further ahead you look.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
