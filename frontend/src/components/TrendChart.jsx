import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { groupBy, getMonthKey, formatMonthLabel, rollingAvg, CHART_OPTS } from "../utils/data";

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

  return (
    <Bar
      data={{
        labels,
        datasets: [
          {
            label: "Workouts",
            data: counts,
            backgroundColor: "#8b5cf680",
            borderColor: "#8b5cf6",
            borderWidth: 1,
            borderRadius: 3,
          },
          {
            label: "3-month avg",
            data: trend,
            type: "line",
            borderColor: "#06b6d4",
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.4,
            fill: false,
          },
        ],
      }}
      options={{
        ...CHART_OPTS,
        plugins: {
          legend: {
            display: true,
            labels: { color: "#94a3b8", boxWidth: 12, font: { size: 11 } },
          },
        },
      }}
    />
  );
}
