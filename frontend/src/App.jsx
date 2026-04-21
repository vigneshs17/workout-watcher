import { useState, useMemo } from "react";
import { useWorkouts }    from "./hooks/useWorkouts";
import { applyFilters, computeStats } from "./utils/data";
import StatCard       from "./components/StatCard";
import Filters        from "./components/Filters";
import DurationChart  from "./components/DurationChart";
import DistanceChart  from "./components/DistanceChart";
import TypeBreakdown  from "./components/TypeBreakdown";
import TrendChart     from "./components/TrendChart";
import ErrorBoundary  from "./components/ErrorBoundary";

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

  const sorted    = useMemo(() => workouts.map((w) => w.start_date).sort(), [workouts]);
  const firstDate = sorted[0]?.slice(0, 10);
  const lastDate  = sorted[sorted.length - 1]?.slice(0, 10);

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
    <ErrorBoundary>
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
        <StatCard
          label="Total Workouts" value={stats.total} color="text-blue-400"
        />
        <StatCard
          label="Avg Calories"       value={Math.round(stats.avgCalories)}   color="text-emerald-400"
          totalLabel="Total Calories" totalValue={stats.totalCalories >= 1000 ? (stats.totalCalories / 1000).toFixed(1) + "k" : Math.round(stats.totalCalories)}
        />
        <StatCard
          label="Avg Duration (min)" value={stats.avgDuration.toFixed(1)}    color="text-amber-400"
          totalLabel="Total Hours"    totalValue={(stats.totalDuration / 60).toFixed(1)}
        />
        <StatCard
          label="Avg Distance (km)"  value={stats.avgDistance.toFixed(2)}    color="text-violet-400"
          totalLabel="Total Distance (km)" totalValue={stats.totalDistance.toFixed(1)}
        />
      </div>

      {/* Duration + Calories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card title={activeRange === "all" ? "Yearly Duration (min)" : activeRange === "1y" ? "Monthly Duration (min)" : "Weekly Duration (min)"}>
          <DurationChart workouts={filtered} range={activeRange} />
        </Card>
        <Card title={activeRange === "all" ? "Yearly Distance (km)" : activeRange === "1y" ? "Monthly Distance (km)" : "Weekly Distance (km)"}>
          <DistanceChart workouts={filtered} range={activeRange} />
        </Card>
      </div>

      {/* Type breakdown + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card title="Workout Type Breakdown">
          <TypeBreakdown workouts={filtered} />
        </Card>
        <Card title={activeRange === "all" ? "Yearly Workouts + Trend" : activeRange === "1y" ? "Monthly Workouts + Trend" : "Weekly Workouts + Trend"}>
          <TrendChart workouts={filtered} range={activeRange} />
        </Card>
      </div>

    </div>
    </ErrorBoundary>
  );
}
