import { useState } from "react";

export default function StatCard({ label, value, color, totalValue, totalLabel }) {
  const [flipped, setFlipped] = useState(false);
  const canFlip = totalValue !== undefined;

  return (
    <div
      className={`flip-card bg-slate-800 rounded-xl h-28 ${canFlip ? "cursor-pointer" : ""} ${flipped ? "flipped" : ""}`}
      onClick={() => canFlip && setFlipped((f) => !f)}
    >
      <div className="flip-card-inner rounded-xl">

        {/* Front — avg */}
        <div className="flip-card-front bg-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className={`text-3xl font-bold leading-none ${color}`}>{value}</div>
            {canFlip && <span className="text-xs text-slate-500 mt-1">tap ↻</span>}
          </div>
          <div className="text-xs uppercase tracking-widest text-slate-400">{label}</div>
        </div>

        {/* Back — total */}
        <div className="flip-card-back bg-slate-700 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className={`text-3xl font-bold leading-none ${color}`}>{totalValue}</div>
            <span className="text-xs text-slate-500 mt-1">tap ↻</span>
          </div>
          <div className="text-xs uppercase tracking-widest text-slate-400">{totalLabel}</div>
        </div>

      </div>
    </div>
  );
}
