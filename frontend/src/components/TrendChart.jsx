import { useMemo } from "react";
import { Chart } from "react-chartjs-2";
import { groupBy, granularityFor, keyAndLabel, rollingAvg } from "../utils/data";

export default function TrendChart({ workouts, range }) {
  const { labels, counts, trend } = useMemo(() => {
    const gran   = granularityFor(range);
    const window = gran === "year" ? 2 : gran === "month" ? 3 : 4;
    const sorted = [...workouts].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    const map    = groupBy(sorted, (w) => keyAndLabel(w.start_date, gran).key, () => 1);
    const keys   = Object.keys(map).sort();
    const fmt    = keys.length ? keyAndLabel(keys[0], gran).fmt : (k) => k;
    const counts = keys.map((k) => map[k]);
    return {
      labels: keys.map(fmt),
      counts,
      trend: rollingAvg(counts, window),
    };
  }, [workouts, range]);

  const options = useMemo(() => ({
    animation: { duration: 300 },
    plugins: {
      legend: { display: true, labels: { color: "#94a3b8", boxWidth: 12, font: { size: 11 } } },
    },
    scales: {
      x: { ticks: { color: "#94a3b8", maxRotation: 45, font: { size: 10 }, maxTicksLimit: 12 }, grid: { color: "#1e293b" } },
      y: { ticks: { color: "#94a3b8", font: { size: 10 } }, grid: { color: "#1e293b" } },
    },
  }), []);

  const avgLabel = granularityFor(range) === "year" ? "2-year avg"
    : granularityFor(range) === "month" ? "3-month avg" : "4-week avg";

  return (
    <Chart
      type="bar"
      data={{
        labels,
        datasets: [
          {
            type: "bar",
            label: "Workouts",
            data: counts,
            backgroundColor: "#8b5cf680",
            borderColor: "#8b5cf6",
            borderWidth: 1,
            borderRadius: 3,
          },
          {
            type: "line",
            label: avgLabel,
            data: trend,
            borderColor: "#06b6d4",
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.4,
            fill: false,
          },
        ],
      }}
      options={options}
    />
  );
}
