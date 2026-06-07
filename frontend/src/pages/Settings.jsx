import useSettings from '../store/useSettings.js';
import toast from 'react-hot-toast';

export default function Settings() {
  const { dailyTarget, setSetting } = useSettings();

  const handleTarget = (e) => {
    const v = Math.max(1, Math.min(200, parseInt(e.target.value) || 1));
    setSetting('dailyTarget', v);
    toast.success(`Daily target set to ${v}`);
  };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>

      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Review</h2>

        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-zinc-200">Daily Review Target</p>
            <p className="text-xs text-zinc-500 mt-0.5">Number of cards you aim to review each day</p>
          </div>
          <input
            type="number"
            min={1}
            max={200}
            value={dailyTarget}
            onChange={handleTarget}
            className="w-20 text-center bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-600"
          />
        </div>
      </section>

      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Scoring System</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[['Again', '1 day', 'text-red-400'], ['Hard', '3 days', 'text-orange-400'], ['Good', '7 days', 'text-amber-400'], ['Easy', '14 days', 'text-emerald-400']].map(([label, days, cls]) => (
            <div key={label} className="flex items-center justify-between bg-zinc-800 rounded-lg px-4 py-3">
              <span className={`font-semibold ${cls}`}>{label}</span>
              <span className="text-zinc-400">{days}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
