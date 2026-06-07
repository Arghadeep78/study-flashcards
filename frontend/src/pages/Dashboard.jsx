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

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function Dashboard() {
  const { stats, fetchStats, fetchDueCards } = useCardStore();
  const { dailyTarget } = useSettings();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
    fetchDueCards();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/review/daily')}>
          <CalendarCheck size={15} />
          Daily Review
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Cards" value={stats?.total} icon={BookOpen} color="text-emerald-400" />
        <StatCard label="Due Today" value={stats?.dueToday} icon={CalendarClock} color="text-amber-400" />
        <StatCard label="Reviewed Today" value={stats?.reviewedToday} icon={CheckCircle2} color="text-blue-400" />
      </div>

      {/* Daily target progress */}
      {stats && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Daily target progress</span>
            <span className="font-mono text-zinc-300">{stats.reviewedToday} / {dailyTarget}</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, (stats.reviewedToday / dailyTarget) * 100)}%` }}
            />
          </div>
          {stats.reviewedToday >= dailyTarget && (
            <p className="text-xs text-emerald-400">Target reached! Great work today.</p>
          )}
        </div>
      )}

      {stats?.topicDistribution?.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-400 mb-4 uppercase tracking-wider">Cards by Topic</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.topicDistribution} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="topic" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {stats.topicDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {stats?.total === 0 && (
        <div className="text-center py-16 text-zinc-600">
          <BookOpen size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium text-zinc-500">No cards yet</p>
          <p className="text-sm mt-1">Create your first flashcard to get started.</p>
          <Button variant="primary" className="mt-4" onClick={() => navigate('/cards/new')}>
            Create Card
          </Button>
        </div>
      )}
    </div>
  );
}
