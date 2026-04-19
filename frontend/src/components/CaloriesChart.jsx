import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { groupBy, getWeekStart, formatWeekLabel } from "../utils/data";

export default function CaloriesChart({ workouts }) {
  const { labels, values } = useMemo(() => {
    const sorted = [...workouts].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    const map    = groupBy(sorted, (w) => getWeekStart(w.start_date), (w) => parseFloat(w.calories) || 0);
    const weeks  = Object.keys(map).sort();
    return {
      labels: weeks.map(formatWeekLabel),
      values: weeks.map((k) => Math.round(map[k])),
    };
  }, [workouts]);

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
          backgroundColor: "#f59e0b80",
          borderColor: "#f59e0b",
          borderWidth: 1,
          borderRadius: 3,
        }],
      }}
      options={options}
    />
  );
}
