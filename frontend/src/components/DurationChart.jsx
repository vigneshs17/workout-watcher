import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { groupBy, granularityFor, keyAndLabel } from "../utils/data";

export default function DurationChart({ workouts, range }) {
  const { labels, values } = useMemo(() => {
    const gran   = granularityFor(range);
    const sorted = [...workouts].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    const map    = groupBy(sorted, (w) => keyAndLabel(w.start_date, gran).key, (w) => parseFloat(w.duration_minutes) || 0);
    const keys   = Object.keys(map).sort();
    const fmt    = keys.length ? keyAndLabel(keys[0], gran).fmt : (k) => k;
    return {
      labels: keys.map(fmt),
      values: keys.map((k) => Math.round(map[k])),
    };
  }, [workouts, range]);

  const options = useMemo(() => ({
    animation: { duration: 300 },
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: "#94a3b8", maxRotation: 45, font: { size: 10 }, maxTicksLimit: 12 }, grid: { color: "#1e293b" } },
      y: { ticks: { color: "#94a3b8", font: { size: 10 } }, grid: { color: "#1e293b" } },
    },
  }), []);

  return (
    <Bar
      data={{
        labels,
        datasets: [{
          data: values,
          backgroundColor: "#10b98180",
          borderColor: "#10b981",
          borderWidth: 1,
          borderRadius: 3,
        }],
      }}
      options={options}
    />
  );
}
