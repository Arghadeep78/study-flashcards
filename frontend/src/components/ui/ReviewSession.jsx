import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, RotateCcw, CheckCircle2, Flag } from 'lucide-react';
import { DifficultyBadge, TopicBadge } from './Badge.jsx';
import CodeBlock from './CodeBlock.jsx';
import Button from './Button.jsx';
import useCardStore from '../../store/useCardStore.js';

const STATIC_TAB_QUESTION = { key: 'question', label: 'Question' };
const STATIC_TAB_NOTES    = { key: 'notes',    label: 'Notes' };

const QUALITY_MAP = { again: 0, hard: 3, good: 4, easy: 5 };
const MIN_EASE = 1.3;

function previewInterval(card, rating) {
  if (!card) return '';
  const quality = QUALITY_MAP[rating];
  let { easeFactor, interval, reviewCount } = card;

  if (quality < 3) {
    interval = 1;
  } else if (reviewCount === 0) {
    interval = 1;
  } else if (reviewCount === 1) {
    interval = quality === 3 ? 4 : 6;
  } else {
    interval = Math.round(interval * (quality === 3 ? 1.2 : easeFactor));
  }

  easeFactor = Math.max(MIN_EASE, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  void easeFactor;

  return interval === 1 ? '1 day' : `${interval} days`;
}

const RATING_STYLES = [
  { label: 'Again', rating: 'again', cls: 'bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/20' },
  { label: 'Hard',  rating: 'hard',  cls: 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20' },
  { label: 'Good',  rating: 'good',  cls: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20' },
  { label: 'Easy',  rating: 'easy',  cls: 'bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-600/20' },
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
  const originalCards = useRef(cards);
  const [queue, setQueue] = useState(cards);
  const [idx, setIdx] = useState(0);
  const [activeTab, setActiveTab] = useState(() => availableTabs(cards[0])[0]?.key ?? 'question');
  const [unlockedTabs, setUnlockedTabs] = useState(() => new Set([availableTabs(cards[0])[0]?.key ?? 'question']));
  const [reviewed, setReviewed] = useState(0);
  const [done, setDone] = useState(false);

  const card = queue[idx];
  const total = queue.length;
  const tabs = card ? availableTabs(card) : [];
  const lastTabKey = tabs[tabs.length - 1]?.key;
  const fullyRevealed = unlockedTabs.has(lastTabKey);

  const resetTabState = (nextCard) => {
    const firstKey = availableTabs(nextCard)[0]?.key ?? 'question';
    setUnlockedTabs(new Set([firstKey]));
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
    // update local queue copy so the flag shows live
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
      <div className="max-w-xl mx-auto mt-24 text-center space-y-4">
        {reviewed > 0 ? (
          <>
            <CheckCircle2 size={48} className="mx-auto text-emerald-400" />
            <h2 className="text-2xl font-bold text-zinc-100">Session Complete!</h2>
            <p className="text-zinc-400">
              Reviewed <span className="text-emerald-400 font-semibold">{reviewed}</span> card{reviewed !== 1 ? 's' : ''}.
            </p>
          </>
        ) : (
          <>
            <CheckCircle2 size={48} className="mx-auto text-zinc-600" />
            <h2 className="text-2xl font-bold text-zinc-100">No cards</h2>
            <p className="text-zinc-400">Nothing to review here.</p>
          </>
        )}
        <div className="flex gap-3 justify-center pt-2">
          {originalCards.current.length > 0 && (
            <Button onClick={restart}><RotateCcw size={14} /> Review Again</Button>
          )}
          {onComplete && (
            <Button onClick={onComplete}>← Back</Button>
          )}
          <Button variant="primary" onClick={() => navigate('/cards/new')}>Add Cards</Button>
        </div>
      </div>
    );
  }

  if (!card) return <div className="text-center mt-24 text-zinc-600">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-zinc-300">{title}</h1>
        <span className="text-xs text-zinc-500">{reviewed + 1} / {total}</span>
      </div>

      {/* Progress */}
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${(reviewed / total) * 100}%` }} />
      </div>

      {/* Card header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-zinc-100">{card.title}</h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <TopicBadge topic={card.subtopic ? `${card.topic} › ${card.subtopic}` : card.topic} />
              <DifficultyBadge difficulty={card.difficulty} />
              {card.problemLink && (
                <a href={card.problemLink} target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-zinc-400 transition-colors">
                  <ExternalLink size={13} />
                </a>
              )}
            </div>
          </div>
          <button
            onClick={handleToggleWeak}
            title={card.weak ? 'Unmark weak' : 'Mark as weak'}
            className={`p-1.5 rounded-lg transition-colors ${card.weak ? 'text-red-400 bg-red-500/10' : 'text-zinc-600 hover:text-red-400 hover:bg-red-500/10'}`}
          >
            <Flag size={15} />
          </button>
        </div>
      </div>

      {/* Chrome-style tabs */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex border-b border-zinc-800 bg-zinc-950/60">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const isLocked = !unlockedTabs.has(tab.key);
            return (
              <button key={tab.key} disabled={isLocked} onClick={() => setActiveTab(tab.key)}
                className={`relative px-5 py-2.5 text-sm font-medium transition-colors border-r border-zinc-800 last:border-r-0
                  ${isActive ? 'bg-zinc-900 text-zinc-100'
                    : isLocked ? 'text-zinc-700 cursor-not-allowed bg-zinc-950/40'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 bg-zinc-950/40'}`}
              >
                {tab.label}
                {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-t" />}
              </button>
            );
          })}
        </div>
        <div className="p-5 min-h-48">
          {activeTab === 'question' && (
            <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {card.question || <span className="text-zinc-600 italic">No problem statement.</span>}
            </p>
          )}
          {activeTab === 'notes' && (
            <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {card.notes || <span className="text-zinc-600 italic">No notes.</span>}
            </p>
          )}
          {activeTab.startsWith('approach-') && (
            <ApproachContent approach={(card.approaches ?? [])[parseInt(activeTab.split('-')[1], 10)]} />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {!fullyRevealed ? (
          <Button variant="primary" className="flex-1 justify-center py-2.5" onClick={unlockNext}>
            Reveal Next →
          </Button>
        ) : showRatings ? (
          RATING_STYLES.map(({ label, rating, cls }) => (
            <button key={rating} onClick={() => handleRating(rating)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors flex flex-col items-center gap-0.5 ${cls}`}>
              <span>{label}</span>
              <span className="text-xs opacity-60 font-normal">{previewInterval(card, rating)}</span>
            </button>
          ))
        ) : (
          <Button variant="primary" className="flex-1 justify-center py-2.5" onClick={advance}>
            Next →
          </Button>
        )}
      </div>
    </div>
  );
}

function ApproachContent({ approach }) {
  if (!hasApproach(approach)) return <p className="text-zinc-600 italic text-sm">No approach added.</p>;
  return (
    <div className="space-y-3">
      {approach.approach && <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{approach.approach}</p>}
      {(approach.timeComplexity || approach.spaceComplexity) && (
        <div className="flex gap-6">
          {approach.timeComplexity && <span className="text-xs text-zinc-500">Time: <span className="text-zinc-300 font-mono">{approach.timeComplexity}</span></span>}
          {approach.spaceComplexity && <span className="text-xs text-zinc-500">Space: <span className="text-zinc-300 font-mono">{approach.spaceComplexity}</span></span>}
        </div>
      )}
      {approach.code && <CodeBlock code={approach.code} />}
    </div>
  );
}
