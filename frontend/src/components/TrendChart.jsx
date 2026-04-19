import { useMemo } from "react";
import { Chart } from "react-chartjs-2";
import { groupBy, getMonthKey, formatMonthLabel, rollingAvg } from "../utils/data";

export default function TrendChart({ workouts }) {
  const { labels, counts, trend } = useMemo(() => {
    const sorted = [...workouts].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    const map    = groupBy(sorted, (w) => getMonthKey(w.start_date), () => 1);
    const months = Object.keys(map).sort();
    const counts = months.map((k) => map[k]);
    return {
      labels: months.map(formatMonthLabel),
      counts,
      trend: rollingAvg(counts, 3),
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
            backgroundColor: "#8b5cf680",
            borderColor: "#8b5cf6",
            borderWidth: 1,
            borderRadius: 3,
          },
          {
            type: "line",
            label: "3-month avg",
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
