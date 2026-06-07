import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ExternalLink, Pencil, Flag, Eye } from 'lucide-react';
import { DifficultyBadge, TopicBadge } from './Badge.jsx';
import CodeBlock from './CodeBlock.jsx';
import useCardStore from '../../store/useCardStore.js';

function hasApproach(a) {
  return a && (a.approach || a.code || a.timeComplexity);
}

function buildTabs(card) {
  const tabs = [];
  if (card.question) tabs.push({ key: 'question', label: 'Question' });
  (card.approaches ?? []).forEach((a, i) => {
    if (hasApproach(a)) tabs.push({ key: `approach-${i}`, label: a.label || `Approach ${i + 1}` });
  });
  if (card.notes) tabs.push({ key: 'notes', label: 'Notes' });
  if (tabs.length === 0) tabs.push({ key: 'question', label: 'Question' });
  return tabs;
}

export default function CardDetailModal({ card, onClose }) {
  const navigate = useNavigate();
  const { toggleWeak } = useCardStore();
  const [localCard, setLocalCard] = useState(card);
  const tabs = buildTabs(localCard);
  const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? 'question');

  // close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // reset tab when card changes
  useEffect(() => {
    setLocalCard(card);
    setActiveTab(buildTabs(card)[0]?.key ?? 'question');
  }, [card._id]);

  const handleToggleWeak = async () => {
    const updated = await toggleWeak(localCard._id);
    setLocalCard(updated);
  };

  const nextReviewDate = localCard.nextReview ? new Date(localCard.nextReview).toLocaleDateString() : '—';
  const lastReviewedDate = localCard.lastReviewed ? new Date(localCard.lastReviewed).toLocaleDateString() : 'Never';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-zinc-800">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-zinc-100 leading-tight">{localCard.title}</h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <TopicBadge topic={localCard.subtopic ? `${localCard.topic} › ${localCard.subtopic}` : localCard.topic} />
              <DifficultyBadge difficulty={localCard.difficulty} />
              {localCard.problemLink && (
                <a href={localCard.problemLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-emerald-400 transition-colors">
                  <ExternalLink size={11} /> LeetCode
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleToggleWeak}
              title={localCard.weak ? 'Unmark weak' : 'Mark as weak'}
              className={`p-1.5 rounded-lg transition-colors ${localCard.weak ? 'text-red-400 bg-red-500/10' : 'text-zinc-600 hover:text-red-400 hover:bg-red-500/10'}`}
            >
              <Flag size={15} />
            </button>
            <button
              onClick={() => { onClose(); navigate(`/cards/${localCard._id}/edit`); }}
              className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title="Edit card"
            >
              <Pencil size={15} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex items-center gap-5 px-5 py-2.5 border-b border-zinc-800/60 bg-zinc-900/40">
          <Stat label="Reviews" value={localCard.visitCount ?? 0} icon={<Eye size={11} />} />
          <Stat label="Interval" value={`${localCard.interval ?? 1}d`} />
          <Stat label="Ease" value={(localCard.easeFactor ?? 2.5).toFixed(2)} />
          <Stat label="Next review" value={nextReviewDate} />
          <Stat label="Last seen" value={lastReviewedDate} />
        </div>

        {/* Tabs */}
        {tabs.length > 0 && (
          <div className="flex border-b border-zinc-800 bg-zinc-950/60 shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-5 py-2.5 text-sm font-medium transition-colors border-r border-zinc-800 last:border-r-0
                  ${activeTab === tab.key
                    ? 'bg-zinc-950 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 bg-zinc-950/40'}`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-t" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'question' && (
            <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {localCard.question || <span className="text-zinc-600 italic">No problem statement.</span>}
            </p>
          )}
          {activeTab === 'notes' && (
            <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {localCard.notes || <span className="text-zinc-600 italic">No notes.</span>}
            </p>
          )}
          {activeTab.startsWith('approach-') && (
            <ApproachContent approach={(localCard.approaches ?? [])[parseInt(activeTab.split('-')[1], 10)]} />
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon && <span className="text-zinc-600">{icon}</span>}
      <span className="text-xs text-zinc-600">{label}</span>
      <span className="text-xs font-semibold text-zinc-300">{value}</span>
    </div>
  );
}

function ApproachContent({ approach }) {
  if (!hasApproach(approach)) return <p className="text-zinc-600 italic text-sm">No approach added.</p>;
  return (
    <div className="space-y-3">
      {approach.approach && (
        <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{approach.approach}</p>
      )}
      {(approach.timeComplexity || approach.spaceComplexity) && (
        <div className="flex gap-6">
          {approach.timeComplexity && (
            <span className="text-xs text-zinc-500">Time: <span className="text-zinc-300 font-mono">{approach.timeComplexity}</span></span>
          )}
          {approach.spaceComplexity && (
            <span className="text-xs text-zinc-500">Space: <span className="text-zinc-300 font-mono">{approach.spaceComplexity}</span></span>
          )}
        </div>
      )}
      {approach.code && <CodeBlock code={approach.code} />}
    </div>
  );
}
