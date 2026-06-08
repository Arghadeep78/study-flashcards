import { useEffect, useRef, useState } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import { ExternalLink, RotateCcw, CheckCircle2, Flag } from 'lucide-react';
import { DifficultyBadge, TopicBadge } from './Badge.jsx';
import CodeBlock from './CodeBlock.jsx';
import Button from './Button.jsx';
import useCardStore from '../../store/useCardStore.js';
import useSettings from '../../store/useSettings.js';

const STATIC_TAB_QUESTION = { key: 'question', label: 'Question' };
const STATIC_TAB_NOTES    = { key: 'notes',    label: 'Notes' };

const RATING_STYLES = [
  { label: 'Missed',  rating: 'fail', cls: 'bg-flat-red-500 hover:bg-flat-red-600 text-white shadow-soft-sm hover:shadow-soft' },
  { label: 'Correct', rating: 'pass', cls: 'bg-flat-green-500 hover:bg-flat-green-600 text-white shadow-soft-sm hover:shadow-soft' },
];

function hasApproach(a) {
  return a && (a.approach || a.code || a.timeComplexity);
}

function availableTabs(card) {
  if (!card) return [];
  const tabs = [];
  if (card.question) tabs.push(STATIC_TAB_QUESTION);
  (card.approaches ?? []).forEach((a, i) => {
    if (hasApproach(a)) tabs.push({ key: `approach-${i}`, label: a.label || `Approach ${i + 1}` });
  });
  if (card.notes) tabs.push(STATIC_TAB_NOTES);
  return tabs;
}

export default function ReviewSession({ cards, onComplete, showRatings = true, title = 'Review' }) {
  const navigate = useNavigate();
  const { reviewCard, toggleWeak, fetchStats } = useCardStore();
  const { autoReveal } = useSettings();
  const originalCards = useRef(cards);

  const initialUnlocked = (c) => {
    const t = availableTabs(c);
    return new Set(autoReveal ? t.map((x) => x.key) : [t[0]?.key ?? 'question']);
  };

  const [queue, setQueue] = useState(cards);
  const [idx, setIdx] = useState(0);
  const [activeTab, setActiveTab] = useState(() => availableTabs(cards[0])[0]?.key ?? 'question');
  const [unlockedTabs, setUnlockedTabs] = useState(() => initialUnlocked(cards[0]));
  const [reviewed, setReviewed] = useState(0);
  const [done, setDone] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  // Block in-app navigation while session is active
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    !done && currentLocation.pathname !== nextLocation.pathname
  );

  // Warn on browser close/refresh
  useEffect(() => {
    const handler = (e) => { if (!done) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [done]);

  const card = queue[idx];
  const total = queue.length;
  const tabs = card ? availableTabs(card) : [];
  const lastTabKey = tabs[tabs.length - 1]?.key;
  const fullyRevealed = unlockedTabs.has(lastTabKey);

  const resetTabState = (nextCard) => {
    const firstKey = availableTabs(nextCard)[0]?.key ?? 'question';
    setUnlockedTabs(initialUnlocked(nextCard));
    setActiveTab(firstKey);
  };

  const unlockNext = () => {
    const ci = tabs.findIndex((t) => t.key === activeTab);
    const next = tabs[ci + 1];
    if (!next) return;
    setUnlockedTabs((s) => new Set([...s, next.key]));
    setActiveTab(next.key);
  };

  const advance = () => {
    const nextIdx = idx + 1;
    const isLast = nextIdx >= queue.length;
    setReviewed((r) => r + 1);
    if (isLast) { setDone(true); fetchStats(); }
    else { setIdx(nextIdx); resetTabState(queue[nextIdx]); }
  };

  const handleRating = async (rating) => {
    await reviewCard(card._id, rating);
    advance();
  };

  const handleToggleWeak = async () => {
    await toggleWeak(card._id);
    setQueue((q) => q.map((c, i) => i === idx ? { ...c, weak: !c.weak } : c));
  };

  const restart = () => {
    const fresh = [...originalCards.current];
    setQueue(fresh);
    setIdx(0);
    setReviewed(0);
    setDone(false);
    resetTabState(fresh[0]);
  };

  const quitConfirmEl = (showQuitConfirm || blocker.state === 'blocked') && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-xl text-center space-y-4">
        <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100">Quit session?</h2>
        <p className="text-sm text-zinc-500">
          Progress so far (<span className="font-bold text-zinc-700 dark:text-zinc-300">{reviewed}</span> reviewed) is already saved. Remaining cards won't be rated.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={() => { blocker.reset?.(); setShowQuitConfirm(false); }}
            className="px-5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Keep going
          </button>
          <button
            onClick={() => { setShowQuitConfirm(false); if (blocker.state === 'blocked') { blocker.proceed(); } else if (onComplete) { onComplete(); } else { navigate('/flashcards'); } }}
            className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors"
          >
            Quit
          </button>
        </div>
      </div>
    </div>
  );

  if (done || queue.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-24 text-center space-y-8 bg-white dark:bg-slate-900 p-12 rounded-3xl shadow-soft transition-colors duration-300">
        {quitConfirmEl}
        {reviewed > 0 ? (
          <>
            <div className="w-24 h-24 bg-flat-green-500 rounded-full flex items-center justify-center mx-auto text-white shadow-soft">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Session Complete!</h2>
            <p className="text-xl text-slate-500 font-bold">
              Reviewed <span className="text-flat-green-500 font-black">{reviewed}</span> card{reviewed !== 1 ? 's' : ''}.
            </p>
          </>
        ) : (
          <>
            <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight">No cards</h2>
            <p className="text-xl text-slate-500 font-bold">Nothing to review here.</p>
          </>
        )}
        <div className="flex gap-4 justify-center pt-8">
          {originalCards.current.length > 0 && (
            <Button variant="secondary" onClick={restart}><RotateCcw size={18} /> Review Again</Button>
          )}
          {onComplete && (
            <Button variant="ghost" onClick={onComplete}>← Back</Button>
          )}
          <Button variant="primary" onClick={() => navigate('/flashcards/cards/new')}>Add Cards</Button>
        </div>
      </div>
    );
  }

  if (!card) return <div className="text-center mt-24 text-zinc-500 font-bold text-lg cursor-wait">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-3">
      {quitConfirmEl}
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{title}</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs font-extrabold text-slate-500 uppercase tracking-widest bg-slate-200 dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm">{reviewed + 1} / {total}</span>
          <button
            onClick={() => setShowQuitConfirm(true)}
            className="text-xs font-bold text-zinc-400 hover:text-red-500 transition-colors uppercase tracking-wide"
          >
            Quit
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
        <div className="h-full bg-flat-blue-500 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${(reviewed / total) * 100}%` }} />
      </div>

      {/* Card header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl px-5 py-4 shadow-soft flex items-start justify-between gap-4 transition-colors duration-300">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 leading-tight tracking-tight">{card.title}</h2>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <TopicBadge topic={card.subtopic ? `${card.topic} › ${card.subtopic}` : card.topic} />
            <DifficultyBadge difficulty={card.difficulty} />
            {card.problemLink && (
              <a href={card.problemLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-extrabold text-slate-500 hover:text-flat-blue-500 transition-colors uppercase tracking-widest">
                <ExternalLink size={14} /> LeetCode
              </a>
            )}
          </div>
        </div>
        <button
          onClick={handleToggleWeak}
          title={card.weak ? 'Unmark weak' : 'Mark as weak'}
          className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-extrabold transition-all duration-300 shadow-sm flex items-center gap-1.5 hover:-translate-y-0.5 ${card.weak ? 'text-white bg-flat-red-500 hover:bg-flat-red-600 shadow-soft-sm' : 'text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700'}`}
        >
          <Flag size={15} />
          {card.weak ? 'Weak' : 'Mark Weak'}
        </button>
      </div>

      {/* Main Content Pane */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-soft overflow-hidden flex flex-col transition-colors duration-300 h-[48vh] min-h-[300px] relative">
        {/* Segmented Control Tabs */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
          <div className="flex p-1 gap-1 bg-slate-200/60 dark:bg-slate-800 rounded-full overflow-x-auto shadow-inner w-max max-w-full">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const isLocked = !unlockedTabs.has(tab.key);
              return (
                <button key={tab.key} disabled={isLocked} onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-1.5 text-xs font-extrabold transition-all duration-300 rounded-full whitespace-nowrap
                    ${isActive ? 'bg-white dark:bg-slate-700 text-flat-blue-600 dark:text-flat-blue-400 shadow-sm'
                      : isLocked ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed hidden md:block opacity-60'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="px-6 py-5 flex-1 overflow-y-auto bg-white dark:bg-slate-900">
          {activeTab === 'question' && (
            <p className="text-base text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-sans font-medium">
              {card.question || <span className="text-slate-400 italic">No problem statement.</span>}
            </p>
          )}
          {activeTab === 'notes' && (
            <p className="text-base text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-sans font-medium">
              {card.notes || <span className="text-slate-400 italic">No notes.</span>}
            </p>
          )}
          {activeTab.startsWith('approach-') && (
            <ApproachContent approach={(card.approaches ?? [])[parseInt(activeTab.split('-')[1], 10)]} />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 items-center justify-center pt-1">
        {!fullyRevealed ? (
          <Button variant="primary" className="flex-1 max-w-md justify-center py-3 text-base tracking-wider rounded-full shadow-soft-sm hover:shadow-soft" onClick={unlockNext}>
            Reveal Next
          </Button>
        ) : showRatings ? (
          <div className="flex gap-4 w-full max-w-lg">
            {RATING_STYLES.map(({ label, rating, cls }) => (
              <button key={rating} onClick={() => handleRating(rating)}
                className={`flex-1 py-3 rounded-full text-base font-black tracking-wider transition-all duration-300 flex items-center justify-center active:scale-95 ${cls} hover:-translate-y-1`}>
                {label}
              </button>
            ))}
          </div>
        ) : (
          <Button variant="primary" className="flex-1 max-w-md justify-center py-3 text-base tracking-wider rounded-full shadow-soft-sm hover:shadow-soft" onClick={advance}>
            Next Card
          </Button>
        )}
      </div>
    </div>
  );
}

function ApproachContent({ approach }) {
  const [subTab, setSubTab] = useState('approach');

  const approachKey = approach?.approach ?? '';
  useEffect(() => { setSubTab('approach'); }, [approachKey]);

  if (!hasApproach(approach)) return <p className="text-zinc-400 italic text-base">No approach added.</p>;

  const hasComplexity = approach.timeComplexity || approach.spaceComplexity;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-full w-fit shadow-inner">
        {[
          { key: 'approach', label: 'Approach' },
          { key: 'code', label: 'Code' },
        ].map((t) => {
          const isActive = subTab === t.key;
          return (
            <button key={t.key} onClick={() => setSubTab(t.key)}
              className={`px-4 py-1.5 text-xs font-extrabold rounded-full transition-all duration-300
                ${isActive ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
              {t.label}
            </button>
          );
        })}
      </div>

      {subTab === 'approach' && (
        approach.approach
          ? <p className="text-base text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-sans font-medium">{approach.approach}</p>
          : <p className="text-slate-400 italic text-base font-medium">No approach description.</p>
      )}

      {subTab === 'code' && (
        <div className="space-y-4">
          {approach.code
            ? <CodeBlock code={approach.code} />
            : <p className="text-slate-400 italic text-base font-medium">No code added.</p>}
          {hasComplexity && (
            <div className="flex gap-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl shadow-inner">
              {approach.timeComplexity && (
                <div className="flex flex-col">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-1">Time</span>
                  <span className="text-slate-800 dark:text-slate-200 font-mono font-bold bg-white dark:bg-slate-700 px-3 py-1 rounded-lg shadow-sm w-fit">{approach.timeComplexity}</span>
                </div>
              )}
              {approach.spaceComplexity && (
                <div className="flex flex-col">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-1">Space</span>
                  <span className="text-slate-800 dark:text-slate-200 font-mono font-bold bg-white dark:bg-slate-700 px-3 py-1 rounded-lg shadow-sm w-fit">{approach.spaceComplexity}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
