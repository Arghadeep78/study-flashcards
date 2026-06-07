import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2, Copy, ExternalLink, Upload, Download, Braces, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import useCardStore from '../store/useCardStore.js';
import useSettings from '../store/useSettings.js';
import { DifficultyBadge, TopicBadge } from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import CardDetailModal from '../components/ui/CardDetailModal.jsx';
import toast from 'react-hot-toast';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const BULK_TEMPLATE = `[
  {
    "title": "Two Sum",
    "topic": "Arrays",
    "subtopic": "Hashing",
    "difficulty": "Easy",
    "problemLink": "https://leetcode.com/problems/two-sum/",
    "question": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
    "approaches": [
      {
        "label": "Brute Force",
        "approach": "Check every pair of elements using two nested loops and return the pair whose sum equals the target.",
        "timeComplexity": "O(n²)",
        "spaceComplexity": "O(1)",
        "code": "vector<int> twoSum(vector<int>& nums, int target) {\\n    for (int i = 0; i < nums.size(); i++)\\n        for (int j = i+1; j < nums.size(); j++)\\n            if (nums[i] + nums[j] == target)\\n                return {i, j};\\n    return {};\\n}"
      },
      {
        "label": "Optimal",
        "approach": "Traverse the array once while storing visited elements in a hashmap. For each element, check if its complement (target - current) already exists in the map.",
        "timeComplexity": "O(n)",
        "spaceComplexity": "O(n)",
        "code": "vector<int> twoSum(vector<int>& nums, int target) {\\n    unordered_map<int,int> mp;\\n    for (int i = 0; i < nums.size(); i++) {\\n        int comp = target - nums[i];\\n        if (mp.count(comp)) return {mp[comp], i};\\n        mp[nums[i]] = i;\\n    }\\n    return {};\\n}"
      }
    ],
    "notes": "HashMap approach is the standard interview solution. Cannot use the same element twice. Exactly one valid answer guaranteed."
  }
]`;

const ALLOWED_CARD_KEYS = new Set(['title', 'topic', 'subtopic', 'difficulty', 'problemLink', 'question', 'approaches', 'notes']);
const ALLOWED_APPROACH_KEYS = new Set(['label', 'approach', 'timeComplexity', 'spaceComplexity', 'code']);
const VALID_DIFFICULTIES = new Set(['Easy', 'Medium', 'Hard']);

function validateAndNormalize(raw) {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
    throw new Error('Each card must be a JSON object');

  const unknownKeys = Object.keys(raw).filter((k) => !ALLOWED_CARD_KEYS.has(k));
  if (unknownKeys.length) throw new Error(`Unknown field(s): ${unknownKeys.join(', ')}`);

  if (!raw.title || typeof raw.title !== 'string') throw new Error('"title" is required and must be a string');
  if (!raw.topic || typeof raw.topic !== 'string') throw new Error('"topic" is required and must be a string');
  if (!raw.difficulty || !VALID_DIFFICULTIES.has(raw.difficulty))
    throw new Error('"difficulty" must be "Easy", "Medium", or "Hard"');

  const card = {
    title: raw.title.trim(),
    topic: raw.topic.trim(),
    subtopic: typeof raw.subtopic === 'string' ? raw.subtopic.trim() : '',
    difficulty: raw.difficulty,
    problemLink: typeof raw.problemLink === 'string' ? raw.problemLink.trim() : '',
    question: typeof raw.question === 'string' ? raw.question.trim() : '',
  };

  if (raw.approaches !== undefined) {
    if (!Array.isArray(raw.approaches)) throw new Error('"approaches" must be an array');
    card.approaches = raw.approaches.map((a, i) => {
      if (typeof a !== 'object' || a === null || Array.isArray(a))
        throw new Error(`"approaches[${i}]" must be an object`);
      const unknownKeys = Object.keys(a).filter((k) => !ALLOWED_APPROACH_KEYS.has(k));
      if (unknownKeys.length) throw new Error(`"approaches[${i}]" has unknown field(s): ${unknownKeys.join(', ')}`);
      return {
        label: typeof a.label === 'string' && a.label.trim() ? a.label.trim() : `Approach ${i + 1}`,
        approach: typeof a.approach === 'string' ? a.approach : '',
        timeComplexity: typeof a.timeComplexity === 'string' ? a.timeComplexity : '',
        spaceComplexity: typeof a.spaceComplexity === 'string' ? a.spaceComplexity : '',
        code: typeof a.code === 'string' ? a.code : '',
      };
    });
  } else {
    card.approaches = [];
  }

  if (raw.notes !== undefined) {
    if (Array.isArray(raw.notes)) {
      card.notes = raw.notes.map((n) => String(n)).join('\n');
    } else if (typeof raw.notes === 'string') {
      card.notes = raw.notes;
    } else {
      throw new Error('"notes" must be a string or array of strings');
    }
  }

  return card;
}

function BulkImportModal({ onClose, onImport }) {
  const [json, setJson] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    let parsed;
    try {
      parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) throw new Error('Input must be a JSON array [ ... ]');
      if (parsed.length === 0) throw new Error('Array is empty');
    } catch (e) {
      setError(e.message);
      return;
    }

    let normalized;
    try {
      normalized = parsed.map((card, i) => {
        try {
          return validateAndNormalize(card);
        } catch (e) {
          throw new Error(`Card ${i + 1}: ${e.message}`);
        }
      });
    } catch (e) {
      setError(e.message);
      return;
    }

    setLoading(true);
    try {
      await onImport(normalized);
      onClose();
    } catch (e) {
      setError(e.response?.data?.error ?? e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Braces size={16} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Bulk Add Cards (JSON)</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-200 transition-colors"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="text-xs text-zinc-500 space-y-1">
              <p>Paste a JSON array of cards. Required: <code className="text-zinc-700 dark:text-zinc-300">title</code>, <code className="text-zinc-700 dark:text-zinc-300">topic</code>, <code className="text-zinc-700 dark:text-zinc-300">difficulty</code>.</p>
              <p>Optional: <code className="text-zinc-700 dark:text-zinc-300">subtopic</code>, <code className="text-zinc-700 dark:text-zinc-300">problemLink</code>, <code className="text-zinc-700 dark:text-zinc-300">question</code>, <code className="text-zinc-700 dark:text-zinc-300">approaches</code>, <code className="text-zinc-700 dark:text-zinc-300">notes</code>.</p>
              <p><code className="text-zinc-700 dark:text-zinc-300">approaches</code> is an array — any number, any names. Each has <code className="text-zinc-700 dark:text-zinc-300">label</code>, <code className="text-zinc-700 dark:text-zinc-300">approach</code>, <code className="text-zinc-700 dark:text-zinc-300">timeComplexity</code>, <code className="text-zinc-700 dark:text-zinc-300">spaceComplexity</code>, <code className="text-zinc-700 dark:text-zinc-300">code</code>.</p>
            </div>
            <button
              type="button"
              onClick={() => { setJson(BULK_TEMPLATE); setError(''); }}
              className="shrink-0 text-xs text-emerald-500 hover:text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/60 rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap"
            >
              Load example
            </button>
          </div>

          <textarea
            value={json}
            onChange={(e) => { setJson(e.target.value); setError(''); }}
            placeholder="Paste your JSON array here..."
            rows={16}
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs font-mono text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-emerald-600 resize-none"
          />

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 gap-3">
          <p className="text-xs text-zinc-600">
            {json.trim() ? (() => { try { const a = JSON.parse(json); return Array.isArray(a) ? `${a.length} card${a.length !== 1 ? 's' : ''} detected` : ''; } catch { return ''; } })() : ''}
          </p>
          <div className="flex gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={!json.trim() || loading}>
              <Braces size={13} /> {loading ? 'Importing...' : 'Import Cards'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AllCards() {
  const navigate = useNavigate();
  const importRef = useRef();
  const searchDebounce = useRef(null);
  const [showBulk, setShowBulk] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const {
    cards, total, loading, filters, topics, page, pages,
    fetchCards, fetchTopics, setFilters, setPage,
    deleteCard, duplicateCard, exportCards, importCards,
  } = useCardStore();

  useEffect(() => {
    fetchCards();
    fetchTopics();
  }, []);

  const applyFilters = (newFilters) => {
    setFilters(newFilters);
    fetchCards();
  };

  const handleFilterChange = (key, value) => {
    if (key === 'search') {
      setFilters({ search: value });
      clearTimeout(searchDebounce.current);
      searchDebounce.current = setTimeout(() => fetchCards(), 350);
    } else {
      applyFilters({ [key]: value });
    }
  };

  const handleTopicChange = (e) =>
    applyFilters({ topic: e.target.value, subtopic: '' });

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importCards(file);
    e.target.value = '';
  };

  const handleBulkImport = async (cards) => {
    const { cardsApi } = await import('../utils/api.js');
    const { data } = await cardsApi.import(cards);
    toast.success(`Imported ${data.imported} cards`);
    fetchCards();
    fetchTopics();
  };

  // Subtopics for currently selected topic
  const selectedTopicObj = topics.find((t) => (typeof t === 'string' ? t : t.topic) === filters.topic);
  const subtopics = selectedTopicObj?.subtopics ?? [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {showBulk && <BulkImportModal onClose={() => setShowBulk(false)} onImport={handleBulkImport} />}
      {selectedCard && <CardDetailModal card={selectedCard} onClose={() => setSelectedCard(null)} />}

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          All Cards <span className="text-zinc-600 text-lg font-normal">({total})</span>
        </h1>
        <div className="flex gap-2">
          <Button onClick={() => importRef.current.click()}>
            <Upload size={14} /> Import
          </Button>
          <Button onClick={() => setShowBulk(true)}>
            <Braces size={14} /> Bulk Add
          </Button>
          <Button onClick={exportCards}>
            <Download size={14} /> Export
          </Button>
          <Button variant="primary" onClick={() => navigate('/cards/new')}>
            <Plus size={14} /> New Card
          </Button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by title or topic..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-emerald-600"
          />
        </div>

        {/* Topic */}
        <select
          value={filters.topic}
          onChange={handleTopicChange}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-emerald-600"
        >
          <option value="">All Topics</option>
          {topics.map((t) => {
            const name = typeof t === 'string' ? t : t.topic;
            return <option key={name} value={name}>{name}</option>;
          })}
        </select>

        {/* Subtopic — only when selected topic has subtopics */}
        {filters.topic && subtopics.length > 0 && (
          <select
            value={filters.subtopic ?? ''}
            onChange={(e) => handleFilterChange('subtopic', e.target.value)}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-emerald-600"
          >
            <option value="">All Subtopics</option>
            {subtopics.map((st) => <option key={st} value={st}>{st}</option>)}
          </select>
        )}

        {/* Difficulty */}
        <select
          value={filters.difficulty}
          onChange={(e) => handleFilterChange('difficulty', e.target.value)}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-emerald-600"
        >
          <option value="">All Difficulties</option>
          {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Card list */}
      {loading ? (
        <div className="text-center py-16 text-zinc-600">Loading...</div>
      ) : cards.length === 0 ? (
        <div className="text-center py-16 text-zinc-600"><p>No cards found.</p></div>
      ) : (
        <div className="space-y-2">
          {cards.map((card) => (
            <CardRow
              key={card._id}
              card={card}
              onView={() => setSelectedCard(card)}
              onEdit={() => navigate(`/cards/${card._id}/edit`)}
              onDelete={() => deleteCard(card._id)}
              onDuplicate={() => duplicateCard(card._id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-zinc-500 font-mono">
            {page} / {pages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= pages}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function CardRow({ card, onView, onEdit, onDelete, onDuplicate }) {
  const confirmDelete = useSettings((s) => s.confirmDelete);
  const [confirming, setConfirming] = useState(false);

  const handleDelete = (e) => {
    e.stopPropagation();
    if (!confirmDelete) { onDelete(); return; } // one-click delete when confirmation is disabled
    if (confirming) { onDelete(); setConfirming(false); }
    else { setConfirming(true); setTimeout(() => setConfirming(false), 2500); }
  };

  // Leitner due check: thresholds (days) per box, unseen cards are always due.
  const BOX_THRESHOLD_DAYS = { 0: 0, 1: 3, 2: 7 };
  const daysSince = card.lastReviewed ? (Date.now() - new Date(card.lastReviewed).getTime()) / 86_400_000 : Infinity;
  const isDue = !card.archived && daysSince >= (BOX_THRESHOLD_DAYS[card.boxLevel] ?? 0);

  return (
    <div
      onClick={onView}
      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors group cursor-pointer"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{card.title}</span>
          {isDue && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Due</span>}
          {card.weak && <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">Weak</span>}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <TopicBadge topic={card.subtopic ? `${card.topic} › ${card.subtopic}` : card.topic} />
          <DifficultyBadge difficulty={card.difficulty} />
          <span className="flex items-center gap-1 text-xs text-zinc-600" title="Times reviewed across all sessions">
            <Eye size={11} />
            {card.visitCount ?? 0}
          </span>
          {card.problemLink && (
            <a
              href={card.problemLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" className="px-2 py-1" onClick={(e) => { e.stopPropagation(); onEdit(); }}><Pencil size={13} /></Button>
        <Button variant="ghost" className="px-2 py-1" onClick={(e) => { e.stopPropagation(); onDuplicate(); }}><Copy size={13} /></Button>
        <Button variant={confirming ? 'danger' : 'ghost'} className="px-2 py-1" onClick={handleDelete}>
          <Trash2 size={13} />
          {confirming && <span className="text-xs">Confirm</span>}
        </Button>
      </div>
    </div>
  );
}
