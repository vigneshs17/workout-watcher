import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { groupBy, getWeekStart, formatWeekLabel, CHART_OPTS } from "../utils/data";

export default function DurationChart({ workouts }) {
  const { labels, values } = useMemo(() => {
    const sorted = [...workouts].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    const map    = groupBy(sorted, (w) => getWeekStart(w.start_date), (w) => w.duration_minutes || 0);
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
          backgroundColor: "#10b98180",
          borderColor: "#10b981",
          borderWidth: 1,
          borderRadius: 3,
        }],
      }}
      options={CHART_OPTS}
    />
  );
}
