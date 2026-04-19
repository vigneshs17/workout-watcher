import { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import { typeColor } from "../utils/data";

export default function TypeBreakdown({ workouts }) {
  const { labels, values, colors } = useMemo(() => {
    const map = workouts.reduce((acc, w) => {
      acc[w.type] = (acc[w.type] || 0) + 1;
      return acc;
    }, {});
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return {
      labels: entries.map(([t]) => t),
      values: entries.map(([, n]) => n),
      colors: entries.map(([t]) => typeColor(t)),
    };
  }, [workouts]);

  return (
    <Doughnut
      data={{
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderColor: "#1e293b",
          borderWidth: 2,
        }],
      }}
      options={{
        animation: { duration: 300 },
        plugins: {
          legend: {
            display: true,
            position: "right",
            labels: { color: "#94a3b8", boxWidth: 12, font: { size: 11 } },
          },
        },
      }}
    />
  );
}
