import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { groupBy, getWeekStart, formatWeekLabel, CHART_OPTS } from "../utils/data";

export default function CaloriesChart({ workouts }) {
  const { labels, values } = useMemo(() => {
    const sorted = [...workouts].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    const map    = groupBy(sorted, (w) => getWeekStart(w.start_date), (w) => w.calories || 0);
    const weeks  = Object.keys(map).sort();
    return {
      labels: weeks.map(formatWeekLabel),
      values: weeks.map((k) => Math.round(map[k])),
    };
  }, [workouts]);

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
      options={CHART_OPTS}
    />
  );
}
