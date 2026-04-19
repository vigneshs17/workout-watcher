export default function StatCard({ label, value, color }) {
  return (
    <div className="bg-slate-800 rounded-xl p-5">
      <div className={`text-3xl font-bold leading-none ${color}`}>{value}</div>
      <div className="text-xs uppercase tracking-widest text-slate-400 mt-2">{label}</div>
    </div>
  );
}
