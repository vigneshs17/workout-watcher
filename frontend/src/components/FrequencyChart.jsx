import { useMemo } from "react";
import { Chart } from "react-chartjs-2";
import { groupBy, getWeekStart, formatWeekLabel, rollingAvg } from "../utils/data";

export default function FrequencyChart({ workouts }) {
  const { labels, counts, trend } = useMemo(() => {
    const sorted = [...workouts].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    const map    = groupBy(sorted, (w) => getWeekStart(w.start_date), () => 1);
    const weeks  = Object.keys(map).sort();
    const counts = weeks.map((k) => map[k]);
    return {
      labels: weeks.map(formatWeekLabel),
      counts,
      trend: rollingAvg(counts, 4),
    };
  }, [workouts]);

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
            backgroundColor: "#3b82f680",
            borderColor: "#3b82f6",
            borderWidth: 1,
            borderRadius: 3,
          },
          {
            type: "line",
            label: "4-week avg",
            data: trend,
            borderColor: "#f59e0b",
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
