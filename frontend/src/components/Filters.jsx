const RANGES = [
  { value: "all", label: "All" },
  { value: "1y",  label: "1Y"  },
  { value: "6m",  label: "6M"  },
  { value: "3m",  label: "3M"  },
];

export default function Filters({ types, activeType, activeRange, onTypeChange, onRangeChange }) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <select
        value={activeType}
        onChange={(e) => onTypeChange(e.target.value)}
        className="bg-slate-700 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">All Types</option>
        {types.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      <div className="flex gap-1">
        {RANGES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onRangeChange(value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeRange === value
                ? "bg-blue-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
