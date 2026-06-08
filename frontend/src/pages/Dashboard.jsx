import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CalendarClock, CheckCircle2, CalendarCheck, FileText, Layers } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import useCardStore from '../store/useCardStore.js';
import useSettings from '../store/useSettings.js';
import StatCard from '../components/ui/StatCard.jsx';
import Button from '../components/ui/Button.jsx';
import { pdfNotesApi } from '../utils/api.js';

const COLORS = ['#3498db', '#2ecc71', '#f1c40f', '#e74c3c', '#9b59b6', '#f39c12', '#1abc9c', '#34495e'];

function ModeCard({ icon: Icon, title, description, color, onClick, stats }) {
  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-soft hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-flat-blue-200 dark:hover:border-flat-blue-800"
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${color}`}>
        <Icon size={28} className="text-white" />
      </div>
      <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight mb-2">{title}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-6">{description}</p>
      {stats && (
        <div className="flex gap-4 flex-wrap">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col">
              <span className="text-xl font-black text-slate-800 dark:text-slate-100">{s.value ?? '—'}</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

export default function Dashboard() {
  const { stats, fetchStats, fetchDueCards } = useCardStore();
  const { dailyTarget, theme } = useSettings();
  const navigate = useNavigate();
  const [pdfDue, setPdfDue] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchDueCards();
    pdfNotesApi.getDueSections()
      .then(({ data }) => setPdfDue(data.length))
      .catch(() => setPdfDue(0));
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Dashboard</h1>
          <p className="text-sm font-bold text-slate-500 mt-2">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Mode tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ModeCard
          icon={Layers}
          title="Flashcards"
          description="Review DSA problems with the Leitner spaced-repetition system. Track weak cards and hit your daily target."
          color="bg-flat-blue-500"
          onClick={() => navigate('/flashcards')}
          stats={[
            { label: 'Total', value: stats?.total },
            { label: 'Due today', value: stats?.dueToday },
            { label: 'Reviewed', value: stats?.reviewedToday },
          ]}
        />
        <ModeCard
          icon={FileText}
          title="PDF Notes"
          description="Review your PDF study notes section by section using the same spaced-repetition algorithm."
          color="bg-flat-green-500"
          onClick={() => navigate('/pdf-notes')}
          stats={[
            { label: 'Sections due', value: pdfDue },
          ]}
        />
      </div>

      {/* Flashcard daily progress */}
      {stats && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 space-y-6 shadow-soft transition-colors duration-300">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-sm">Flashcard daily target</span>
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-4 py-1.5 rounded-full">{stats.reviewedToday} / {dailyTarget}</span>
              <Button variant="primary" onClick={() => navigate('/flashcards/review/daily')}>
                <CalendarCheck size={16} /> Review
              </Button>
            </div>
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

      {/* Cards by topic chart */}
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
          <Button variant="primary" onClick={() => navigate('/flashcards/cards/new')}>
            Create Card
          </Button>
        </div>
      )}
    </div>
  );
}
