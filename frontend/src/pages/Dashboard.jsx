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
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-zinc-800 dark:text-zinc-100 font-sans tracking-tight">Dashboard</h1>
          <p className="text-sm font-semibold text-zinc-500 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
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
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-4 shadow-sm transition-colors duration-200">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Daily target progress</span>
            <span className="font-mono font-bold text-zinc-800 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-md">{stats.reviewedToday} / {dailyTarget}</span>
          </div>
          <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-flat-green-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (stats.reviewedToday / dailyTarget) * 100)}%` }}
            />
          </div>
          {stats.reviewedToday >= dailyTarget && (
            <p className="text-sm font-bold text-flat-green-600 dark:text-flat-green-500">Target reached! Great work today.</p>
          )}
        </div>
      )}

      {stats?.topicDistribution?.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-xl p-6 transition-colors duration-200">
          <h2 className="text-sm font-bold text-zinc-500 mb-6 uppercase tracking-wider">Cards by Topic</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.topicDistribution} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="topic" tick={{ fill: theme === 'dark' ? '#71717a' : '#a1a1aa', fontSize: 13, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: theme === 'dark' ? '#71717a' : '#a1a1aa', fontSize: 13, fontWeight: 'bold' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: theme === 'dark' ? '#18181b' : '#ffffff', border: theme === 'dark' ? '1px solid #27272a' : '1px solid #e4e4e7', borderRadius: 8, fontSize: 13, fontWeight: 'bold', color: theme === 'dark' ? '#fff' : '#000' }}
                cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {stats.topicDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {stats?.total === 0 && (
        <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 transition-colors duration-200">
          <BookOpen size={48} className="mx-auto mb-4 text-zinc-300 dark:text-zinc-600" />
          <p className="text-xl font-bold text-zinc-600 dark:text-zinc-400">No cards yet</p>
          <p className="text-sm mt-2 text-zinc-500 mb-6 font-medium">Create your first flashcard to get started.</p>
          <Button variant="primary" onClick={() => navigate('/cards/new')}>
            Create Card
          </Button>
        </div>
      )}
    </div>
  );
}
