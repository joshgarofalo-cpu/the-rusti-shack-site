/**
 * Three genuine statistical forecasters, implemented from scratch so the info
 * buttons can honestly explain them. All operate on a monthly numeric series.
 *
 *  linear   — ordinary least-squares trend line, extended forward.
 *  seasonal — OLS trend + additive monthly seasonal indices (classical decomposition).
 *  holt     — Holt's linear exponential smoothing (level + trend, recent-weighted).
 *
 * The shaded band is z · RMSE · √h (h = months ahead): the model's typical error,
 * widening the further out we look because step-ahead uncertainty compounds.
 */

export type ModelKey = "seasonal" | "linear" | "holt";
export type SeriesPoint = { ym: string; value: number };
export type ChartPoint = {
  ym: string;
  actual: number | null;
  mean: number | null;
  lower: number | null;
  upper: number | null;
};
export type ModelOutput = { key: ModelKey; points: ChartPoint[]; mapePct: number };

const Z = 1.28; // ~80% band

export const MODEL_INFO: Record<ModelKey, { name: string; short: string; blurb: string }> = {
  seasonal: {
    name: "Seasonal trend",
    short: "trend + season",
    blurb:
      "Fits a straight-line trend through your monthly history, then adds back the " +
      "repeating month-to-month pattern (busy tourist season vs. quiet months) learned " +
      "from past years. Assumes that seasonal pattern repeats. Trust it most for a " +
      "tourist-driven shop with a strong, consistent yearly cycle — it's the best read " +
      "of “what will next season look like.” It can lag if the underlying trend shifts suddenly.",
  },
  linear: {
    name: "Linear trend",
    short: "straight line",
    blurb:
      "Draws the best-fit straight line through every month of history (least-squares " +
      "regression) and extends it. Assumes growth is roughly steady and the future keeps " +
      "the same slope. Simple and stable — a good baseline over the medium term. Because " +
      "it ignores seasonality, it will smooth right over the peaks and troughs of the season.",
  },
  holt: {
    name: "Holt's smoothing",
    short: "recent-weighted",
    blurb:
      "Exponential smoothing that tracks the current level and momentum, weighting recent " +
      "months far more than old ones (Holt's linear method). Assumes the near-term direction " +
      "is the best guide to what's next. Trust it when the business has recently sped up or " +
      "slowed and you care more about the last several months than the full five-year history.",
  },
};

function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function mape(actual: number[], fit: number[]): number {
  let s = 0, c = 0;
  for (let i = 0; i < actual.length; i++) if (actual[i] > 0) { s += Math.abs(actual[i] - fit[i]) / actual[i]; c++; }
  return c ? (s / c) * 100 : 0;
}
function rmse(actual: number[], fit: number[]): number {
  let s = 0;
  for (let i = 0; i < actual.length; i++) s += (actual[i] - fit[i]) ** 2;
  return Math.sqrt(s / Math.max(1, actual.length));
}
/** OLS slope/intercept of y on its index 0..n-1. */
function ols(y: number[]): { a: number; b: number } {
  const n = y.length;
  const mx = (n - 1) / 2;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (i - mx) * (y[i] - my); den += (i - mx) ** 2; }
  const b = den ? num / den : 0;
  return { a: my - b * mx, b };
}

type Fit = { fitted: number[]; forecast: number[] };

function fitLinear(y: number[], h: number): Fit {
  const { a, b } = ols(y);
  return {
    fitted: y.map((_, i) => a + b * i),
    forecast: Array.from({ length: h }, (_, k) => a + b * (y.length + k)),
  };
}

function fitSeasonal(y: number[], h: number): Fit {
  const { a, b } = ols(y);
  const trend = y.map((_, i) => a + b * i);
  // additive seasonal index per calendar position (needs the ym months; we pass 0..11 offset)
  const seas: number[] = Array(12).fill(0);
  const cnt: number[] = Array(12).fill(0);
  for (let i = 0; i < y.length; i++) {
    const m = (fitSeasonal.startMonth + i) % 12;
    seas[m] += y[i] - trend[i]; cnt[m]++;
  }
  for (let m = 0; m < 12; m++) seas[m] = cnt[m] ? seas[m] / cnt[m] : 0;
  return {
    fitted: y.map((_, i) => trend[i] + seas[(fitSeasonal.startMonth + i) % 12]),
    forecast: Array.from({ length: h }, (_, k) => {
      const i = y.length + k;
      return a + b * i + seas[(fitSeasonal.startMonth + i) % 12];
    }),
  };
}
// month (0-11) of the first data point; set before each call
fitSeasonal.startMonth = 0 as number;

function fitHolt(y: number[], h: number, alpha = 0.35, beta = 0.15): Fit {
  let level = y[0];
  let trend = y.length > 1 ? y[1] - y[0] : 0;
  const fitted: number[] = [y[0]];
  for (let i = 1; i < y.length; i++) {
    const prev = level + trend;
    fitted.push(prev);
    const newLevel = alpha * y[i] + (1 - alpha) * (level + trend);
    trend = beta * (newLevel - level) + (1 - beta) * trend;
    level = newLevel;
  }
  return {
    fitted,
    forecast: Array.from({ length: h }, (_, k) => level + (k + 1) * trend),
  };
}

/** Run a model over the series and assemble chart points (history + forecast + band). */
export function runModel(series: SeriesPoint[], key: ModelKey, horizon: number): ModelOutput {
  const y = series.map((p) => p.value);
  const startMonth = series.length ? parseInt(series[0].ym.slice(5, 7)) - 1 : 0;
  fitSeasonal.startMonth = startMonth;

  const fit = key === "linear" ? fitLinear(y, horizon)
    : key === "seasonal" ? fitSeasonal(y, horizon)
    : fitHolt(y, horizon);

  // Error measured over the recent window (last 24 mo) so the tiny 2021 startup
  // months don't distort it; expressed as % of a normal recent month.
  const recentN = Math.min(24, y.length);
  const rA = y.slice(-recentN);
  const rF = fit.fitted.slice(-recentN);
  const err = rmse(rA, rF);
  const meanRecent = rA.reduce((s, v) => s + v, 0) / Math.max(1, rA.length);
  const errPct = meanRecent ? (err / meanRecent) * 100 : 0;

  const points: ChartPoint[] = series.map((p) => ({ ym: p.ym, actual: p.value, mean: null, lower: null, upper: null }));

  // Bridge the solid history into the dashed forecast from the last actual point.
  if (points.length) {
    const last = points[points.length - 1];
    last.mean = last.actual;
    last.lower = last.actual;
    last.upper = last.actual;
  }
  const lastYm = series.length ? series[series.length - 1].ym : "2026-01";
  for (let k = 0; k < horizon; k++) {
    const mean = Math.max(0, fit.forecast[k]);
    const half = Z * err * Math.sqrt(k + 1);
    points.push({
      ym: addMonths(lastYm, k + 1),
      actual: null,
      mean,
      lower: Math.max(0, mean - half),
      upper: mean + half,
    });
  }
  return { key, points, mapePct: errPct };
}
