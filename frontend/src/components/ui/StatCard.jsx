export default function StatCard({ label, value, icon: Icon, color = 'text-flat-blue-500' }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 flex items-center gap-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]">
      <div className={`p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center ${color}`}>
        <Icon size={28} />
      </div>
      <div>
        <p className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{value ?? '—'}</p>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest">{label}</p>
      </div>
    </div>
  );
}
