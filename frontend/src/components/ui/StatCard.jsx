export default function StatCard({ label, value, icon: Icon, color = 'text-flat-blue-500' }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-xl p-6 flex items-center gap-5 transition-colors duration-200">
      <div className={`p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center ${color}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-3xl font-black text-zinc-800 dark:text-zinc-100">{value ?? '—'}</p>
        <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mt-1 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}
