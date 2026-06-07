import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, RotateCcw, CheckCircle2, Flag } from 'lucide-react';
import { DifficultyBadge, TopicBadge } from './Badge.jsx';
import CodeBlock from './CodeBlock.jsx';
import Button from './Button.jsx';
import useCardStore from '../../store/useCardStore.js';
import useSettings from '../../store/useSettings.js';

const STATIC_TAB_QUESTION = { key: 'question', label: 'Question' };
const STATIC_TAB_NOTES    = { key: 'notes',    label: 'Notes' };

const RATING_STYLES = [
  { label: 'Missed',  rating: 'fail', cls: 'bg-flat-red-500 hover:bg-flat-red-600 text-white shadow-sm' },
  { label: 'Correct', rating: 'pass', cls: 'bg-flat-green-500 hover:bg-flat-green-600 text-white shadow-sm' },
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

  if (done || queue.length === 0) {
    return (
      <div className="max-w-xl mx-auto mt-24 text-center space-y-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-10 rounded-2xl shadow-sm transition-colors duration-200">
        {reviewed > 0 ? (
          <>
            <div className="w-20 h-20 bg-flat-green-500 rounded-full flex items-center justify-center mx-auto text-white shadow-sm">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100">Session Complete!</h2>
            <p className="text-lg text-zinc-500 font-medium">
              Reviewed <span className="text-flat-green-500 font-bold">{reviewed}</span> card{reviewed !== 1 ? 's' : ''}.
            </p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-500">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100">No cards</h2>
            <p className="text-lg text-zinc-500 font-medium">Nothing to review here.</p>
          </>
        )}
        <div className="flex gap-4 justify-center pt-6">
          {originalCards.current.length > 0 && (
            <Button variant="secondary" onClick={restart}><RotateCcw size={16} /> Review Again</Button>
          )}
          {onComplete && (
            <Button variant="ghost" onClick={onComplete}>← Back</Button>
          )}
          <Button variant="primary" onClick={() => navigate('/cards/new')}>Add Cards</Button>
        </div>
      </div>
    );
  }

  if (!card) return <div className="text-center mt-24 text-zinc-500 font-bold text-lg cursor-wait">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight">{title}</h1>
        <span className="text-sm font-bold text-zinc-500 uppercase tracking-wider bg-zinc-200 dark:bg-zinc-800 px-3 py-1 rounded shadow-sm">{reviewed + 1} / {total}</span>
      </div>

      {/* Progress */}
      <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden shadow-inner">
        <div className="h-full bg-flat-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${(reviewed / total) * 100}%` }} />
      </div>

      {/* Card header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex items-start justify-between gap-4 transition-colors duration-200">
        <div>
          <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 leading-tight">{card.title}</h2>
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <TopicBadge topic={card.subtopic ? `${card.topic} › ${card.subtopic}` : card.topic} />
            <DifficultyBadge difficulty={card.difficulty} />
            {card.problemLink && (
              <a href={card.problemLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-flat-blue-500 transition-colors uppercase tracking-wider">
                <ExternalLink size={14} /> LeetCode
              </a>
            )}
          </div>
        </div>
        <button
          onClick={handleToggleWeak}
          title={card.weak ? 'Unmark weak' : 'Mark as weak'}
          className={`px-4 py-2 rounded-lg font-bold transition-colors shadow-sm flex items-center gap-2 ${card.weak ? 'text-white bg-flat-red-500 hover:bg-flat-red-600' : 'text-zinc-600 bg-zinc-100 hover:bg-zinc-200 dark:text-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700'}`}
        >
          <Flag size={16} />
          {card.weak ? 'Weak' : 'Mark Weak'}
        </button>
      </div>

      {/* Main Content Pane */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col transition-colors duration-200 h-[65vh] min-h-[500px]">
        {/* Flat Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-4 pt-3 gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const isLocked = !unlockedTabs.has(tab.key);
            return (
              <button key={tab.key} disabled={isLocked} onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3 text-sm font-bold transition-all rounded-t-lg border-b-4 whitespace-nowrap
                  ${isActive ? 'border-flat-blue-500 text-flat-blue-600 dark:text-flat-blue-400 bg-white dark:bg-zinc-900 shadow-sm'
                    : isLocked ? 'border-transparent text-zinc-400 dark:text-zinc-600 cursor-not-allowed hidden md:block'
                    : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="p-8 flex-1 overflow-y-auto bg-white dark:bg-zinc-900">
          {activeTab === 'question' && (
            <p className="text-[17px] text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed font-sans">
              {card.question || <span className="text-zinc-400 italic">No problem statement.</span>}
            </p>
          )}
          {activeTab === 'notes' && (
            <p className="text-[17px] text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed font-sans">
              {card.notes || <span className="text-zinc-400 italic">No notes.</span>}
            </p>
          )}
          {activeTab.startsWith('approach-') && (
            <ApproachContent approach={(card.approaches ?? [])[parseInt(activeTab.split('-')[1], 10)]} />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 items-center justify-center pt-4">
        {!fullyRevealed ? (
          <Button variant="primary" className="flex-1 max-w-sm justify-center py-4 text-lg shadow-md" onClick={unlockNext}>
            Reveal Next
          </Button>
        ) : showRatings ? (
          <div className="flex gap-4 w-full max-w-md">
            {RATING_STYLES.map(({ label, rating, cls }) => (
              <button key={rating} onClick={() => handleRating(rating)}
                className={`flex-1 py-4 rounded-xl text-lg font-black transition-all flex items-center justify-center active:scale-95 ${cls}`}>
                {label}
              </button>
            ))}
          </div>
        ) : (
          <Button variant="primary" className="flex-1 max-w-sm justify-center py-4 text-lg shadow-md" onClick={advance}>
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
    <div className="space-y-6">
      <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg w-fit shadow-inner">
        {[
          { key: 'approach', label: 'Approach' },
          { key: 'code', label: 'Code' },
        ].map((t) => {
          const isActive = subTab === t.key;
          return (
            <button key={t.key} onClick={() => setSubTab(t.key)}
              className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all
                ${isActive ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}>
              {t.label}
            </button>
          );
        })}
      </div>

      {subTab === 'approach' && (
        approach.approach
          ? <p className="text-[17px] text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed font-sans">{approach.approach}</p>
          : <p className="text-zinc-400 italic text-[17px]">No approach description.</p>
      )}

      {subTab === 'code' && (
        <div className="space-y-4">
          {approach.code
            ? <CodeBlock code={approach.code} />
            : <p className="text-zinc-400 italic text-[17px]">No code added.</p>}
          {hasComplexity && (
            <div className="flex gap-6 mt-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
              {approach.timeComplexity && (
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Time</span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-mono font-bold bg-zinc-200 dark:bg-zinc-800 px-2 py-1 rounded w-fit">{approach.timeComplexity}</span>
                </div>
              )}
              {approach.spaceComplexity && (
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Space</span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-mono font-bold bg-zinc-200 dark:bg-zinc-800 px-2 py-1 rounded w-fit">{approach.spaceComplexity}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
