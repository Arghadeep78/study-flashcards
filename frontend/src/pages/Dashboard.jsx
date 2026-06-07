import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CalendarClock, CheckCircle2, CalendarCheck } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import useCardStore from '../store/useCardStore.js';
import useSettings from '../store/useSettings.js';
import StatCard from '../components/ui/StatCard.jsx';
import Button from '../components/ui/Button.jsx';

const COLORS = ['#3498db', '#2ecc71', '#f1c40f', '#e74c3c', '#9b59b6', '#f39c12', '#1abc9c', '#34495e'];

export default function Dashboard() {
  const { stats, fetchStats, fetchDueCards } = useCardStore();
  const { dailyTarget, theme } = useSettings();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
    fetchDueCards();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Dashboard</h1>
          <p className="text-sm font-bold text-slate-500 mt-2">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/review/daily')}>
          <CalendarCheck size={18} />
          Daily Review
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Cards" value={stats?.total} icon={BookOpen} color="text-flat-blue-500" />
        <StatCard label="Due Today" value={stats?.dueToday} icon={CalendarClock} color="text-flat-yellow-500" />
        <StatCard label="Reviewed Today" value={stats?.reviewedToday} icon={CheckCircle2} color="text-flat-green-500" />
      </div>

      {stats && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 space-y-6 shadow-soft transition-colors duration-300">
          <div className="flex items-center justify-between text-sm">
            <span className="font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Daily target progress</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-4 py-1.5 rounded-full">{stats.reviewedToday} / {dailyTarget}</span>
          </div>
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-flat-green-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(100, (stats.reviewedToday / dailyTarget) * 100)}%` }}
            />
          </div>
          {stats.reviewedToday >= dailyTarget && (
            <p className="text-sm font-bold text-flat-green-600 dark:text-flat-green-500">Target reached! Great work today.</p>
          )}
        </div>
      )}

      {stats?.topicDistribution?.length > 0 && (
        <div className="bg-white dark:bg-slate-900 shadow-soft rounded-3xl p-8 transition-colors duration-300">
          <h2 className="text-sm font-extrabold text-slate-500 mb-8 uppercase tracking-widest">Cards by Topic</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.topicDistribution} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="topic" tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 13, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 13, fontWeight: 'bold' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: theme === 'dark' ? '#0f172a' : '#ffffff', border: 'none', borderRadius: 16, fontSize: 13, fontWeight: 'bold', color: theme === 'dark' ? '#fff' : '#000', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08)' }}
                cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}
              />
              <Bar dataKey="count" radius={[8, 8, 8, 8]}>
                {stats.topicDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {stats?.total === 0 && (
        <div className="text-center py-24 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 transition-colors duration-300">
          <BookOpen size={64} className="mx-auto mb-6 text-slate-300 dark:text-slate-700" />
          <p className="text-2xl font-black text-slate-700 dark:text-slate-300 tracking-tight">No cards yet</p>
          <p className="text-base mt-3 text-slate-500 mb-8 font-medium">Create your first flashcard to get started.</p>
          <Button variant="primary" onClick={() => navigate('/cards/new')}>
            Create Card
          </Button>
        </div>
      )}
    </div>
  );
}
