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

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    setLocalCard(card);
    setActiveTab(buildTabs(card)[0]?.key ?? 'question');
  }, [card._id]);

  const handleToggleWeak = async () => {
    const updated = await toggleWeak(localCard._id);
    setLocalCard(updated);
  };

  const lastReviewedDate = localCard.lastReviewed ? new Date(localCard.lastReviewed).toLocaleDateString() : 'Never';
  const boxLabel = localCard.archived ? 'Archived' : `Box ${localCard.boxLevel ?? 0}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-3xl h-[85vh] max-h-[850px] min-h-[500px] flex flex-col shadow-xl overflow-hidden transition-colors duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-5 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 leading-tight tracking-tight">{localCard.title}</h2>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <TopicBadge topic={localCard.subtopic ? `${localCard.topic} › ${localCard.subtopic}` : localCard.topic} />
              <DifficultyBadge difficulty={localCard.difficulty} />
              {localCard.problemLink && (
                <a href={localCard.problemLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-flat-blue-500 transition-colors uppercase tracking-wider">
                  <ExternalLink size={14} /> LeetCode
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggleWeak}
              title={localCard.weak ? 'Unmark weak' : 'Mark as weak'}
              className={`p-2 rounded-lg transition-colors shadow-sm ${localCard.weak ? 'text-white bg-flat-red-500 hover:bg-flat-red-600' : 'text-zinc-500 bg-zinc-200 hover:bg-zinc-300 dark:text-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600'}`}
            >
              <Flag size={18} />
            </button>
            <button
              onClick={() => { onClose(); navigate(`/cards/${localCard._id}/edit`); }}
              className="p-2 rounded-lg text-zinc-500 bg-zinc-200 hover:bg-zinc-300 dark:text-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors shadow-sm"
              title="Edit card"
            >
              <Pencil size={18} />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg text-zinc-500 bg-zinc-200 hover:bg-zinc-300 dark:text-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors shadow-sm">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex items-center gap-6 px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <Stat label="Reviews" value={localCard.visitCount ?? 0} icon={<Eye size={14} />} />
          <Stat label="Box" value={boxLabel} />
          <Stat label="Last seen" value={lastReviewedDate} />
        </div>

        {/* Tabs */}
        {tabs.length > 0 && (
          <div className="flex px-4 pt-3 gap-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 shrink-0 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2.5 text-sm font-bold transition-all rounded-t-lg border-b-4 
                  ${activeTab === tab.key
                    ? 'border-flat-blue-500 text-flat-blue-600 dark:text-flat-blue-400 bg-white dark:bg-zinc-800/80 shadow-sm'
                    : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-zinc-900">
          {activeTab === 'question' && (
            <p className="text-base text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed font-sans">
              {localCard.question || <span className="text-zinc-400 italic">No problem statement.</span>}
            </p>
          )}
          {activeTab === 'notes' && (
            <p className="text-base text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed font-sans">
              {localCard.notes || <span className="text-zinc-400 italic">No notes.</span>}
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
    <div className="flex items-center gap-2">
      {icon && <span className="text-zinc-400 dark:text-zinc-500">{icon}</span>}
      <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-black text-zinc-800 dark:text-zinc-200">{value}</span>
    </div>
  );
}

function ApproachContent({ approach }) {
  const [subTab, setSubTab] = useState('approach');

  const approachKey = approach?.approach ?? '';
  useEffect(() => { setSubTab('approach'); }, [approachKey]);

  if (!hasApproach(approach)) return <p className="text-zinc-400 italic text-sm">No approach added.</p>;

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
          ? <p className="text-base text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed font-sans">{approach.approach}</p>
          : <p className="text-zinc-400 italic text-base">No approach description.</p>
      )}

      {subTab === 'code' && (
        <div className="space-y-4">
          {approach.code
            ? <CodeBlock code={approach.code} />
            : <p className="text-zinc-400 italic text-base">No code added.</p>}
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
