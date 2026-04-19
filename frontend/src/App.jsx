import { useState, useMemo } from "react";
import { useWorkouts }    from "./hooks/useWorkouts";
import { applyFilters, computeStats } from "./utils/data";
import StatCard       from "./components/StatCard";
import Filters        from "./components/Filters";
import FrequencyChart from "./components/FrequencyChart";
import DurationChart  from "./components/DurationChart";
import CaloriesChart  from "./components/CaloriesChart";
import TypeBreakdown  from "./components/TypeBreakdown";
import TrendChart     from "./components/TrendChart";

function Card({ title, children }) {
  return (
    <div className="bg-slate-800 rounded-xl p-5">
      {title && (
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}

export default function App() {
  const { workouts, loading, error } = useWorkouts();
  const [activeType,  setActiveType]  = useState("all");
  const [activeRange, setActiveRange] = useState("all");

  const types = useMemo(
    () => [...new Set(workouts.map((w) => w.type))].sort(),
    [workouts]
  );

  const filtered = useMemo(
    () => applyFilters(workouts, activeType, activeRange),
    [workouts, activeType, activeRange]
  );

  const stats = useMemo(() => computeStats(filtered), [filtered]);

  const firstDate = workouts.map((w) => w.start_date).sort()[0]?.slice(0, 10);
  const lastDate  = workouts.map((w) => w.start_date).sort().at(-1)?.slice(0, 10);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400 text-lg animate-pulse">Loading workouts…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-400 text-lg">Failed to load: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Workout Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            {workouts.length} workouts · {firstDate} → {lastDate}
          </p>
        </div>
        <Filters
          types={types}
          activeType={activeType}
          activeRange={activeRange}
          onTypeChange={setActiveType}
          onRangeChange={setActiveRange}
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Workouts"   value={stats.total}                    color="text-blue-400"   />
        <StatCard label="Total Hours"      value={stats.hours.toFixed(1)}         color="text-emerald-400"/>
        <StatCard label="Total Calories"   value={stats.calories >= 1000 ? (stats.calories / 1000).toFixed(1) + "k" : Math.round(stats.calories)} color="text-amber-400"  />
        <StatCard label="Avg Duration (min)" value={stats.avgDuration.toFixed(1)} color="text-violet-400" />
      </div>

      {/* Workouts per week */}
      <Card title="Workouts per Week + 4-Week Trend">
        <FrequencyChart workouts={filtered} />
      </Card>

      {/* Duration + Calories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card title="Weekly Duration (min)">
          <DurationChart workouts={filtered} />
        </Card>
        <Card title="Weekly Calories">
          <CaloriesChart workouts={filtered} />
        </Card>
      </div>

      {/* Type breakdown + Monthly trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card title="Workout Type Breakdown">
          <TypeBreakdown workouts={filtered} />
        </Card>
        <Card title="Monthly Workouts + 3-Month Trend">
          <TrendChart workouts={filtered} />
        </Card>
      </div>

    </div>
  );
}
