export const TYPE_COLORS = {
  "Pool Swim":       "#06b6d4",
  "Outdoor Run":     "#10b981",
  "Outdoor Cycling": "#f59e0b",
  "Run":             "#8b5cf6",
  "Indoor Run":      "#ec4899",
  "Indoor Cycling":  "#f97316",
  "HIIT":            "#ef4444",
  "Yoga":            "#a78bfa",
};
export const DEFAULT_COLOR = "#64748b";
export const typeColor = (t) => TYPE_COLORS[t] || DEFAULT_COLOR;

export function getWeekStart(dateStr) {
  const d   = new Date(dateStr);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

export function getMonthKey(dateStr) {
  return dateStr.slice(0, 7);
}

export function formatWeekLabel(dateStr) {
  const [, m, d] = dateStr.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[+m - 1]} ${d}`;
}

export function formatMonthLabel(key) {
  const [y, m] = key.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[+m - 1]} '${y.slice(2)}`;
}

export function groupBy(arr, keyFn, valueFn) {
  return arr.reduce((acc, item) => {
    const k = keyFn(item);
    acc[k] = (acc[k] || 0) + valueFn(item);
    return acc;
  }, {});
}

export function rollingAvg(values, window = 4) {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1);
    return +(slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(2);
  });
}

export function cutoffDate(range) {
  const now = Date.now();
  if (range === "3m") return new Date(now - 90  * 86400000);
  if (range === "6m") return new Date(now - 180 * 86400000);
  if (range === "1y") return new Date(now - 365 * 86400000);
  return null;
}

export function applyFilters(workouts, type, range) {
  let w = workouts;
  const cutoff = cutoffDate(range);
  if (cutoff) w = w.filter((x) => new Date(x.start_date) >= cutoff);
  if (type !== "all") w = w.filter((x) => x.type === type);
  return w;
}

export function computeStats(workouts) {
  const total       = workouts.length;
  const minutes     = workouts.reduce((s, w) => s + (w.duration_minutes || 0), 0);
  const avgDuration = total ? minutes / total : 0;
  const withDist    = workouts.filter((w) => w.distance_km > 0);
  const avgDistance = withDist.length ? withDist.reduce((s, w) => s + w.distance_km, 0) / withDist.length : 0;
  return { total, hours: minutes / 60, avgDuration, avgDistance };
}

export const CHART_OPTS = {
  animation: { duration: 300 },
  plugins: { legend: { display: false } },
  scales: {
    x: {
      ticks: { color: "#94a3b8", maxRotation: 45, font: { size: 10 }, maxTicksLimit: 12 },
      grid:  { color: "#1e293b" },
    },
    y: {
      ticks: { color: "#94a3b8", font: { size: 10 } },
      grid:  { color: "#1e293b" },
    },
  },
};
