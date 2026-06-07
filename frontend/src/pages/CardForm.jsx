import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Plus, X, GripVertical, Trash2, Braces, LayoutList } from 'lucide-react';
import useCardStore from '../store/useCardStore.js';
import { cardsApi } from '../utils/api.js';
import Button from '../components/ui/Button.jsx';
import toast from 'react-hot-toast';

const DEFAULT_TOPICS = [
  'Arrays', 'Strings', 'Linked List', 'Stacks & Queues', 'Trees', 'Graphs',
  'Dynamic Programming', 'Greedy', 'Binary Search', 'Backtracking', 'Heap',
  'Trie', 'Sliding Window', 'Two Pointers', 'Math', 'Bit Manipulation', 'Other',
];

const TOPICS_KEY = 'dsa_custom_topics';

function loadCustomTopics() {
  try { return JSON.parse(localStorage.getItem(TOPICS_KEY)) ?? []; } catch { return []; }
}
function saveCustomTopics(topics) {
  localStorage.setItem(TOPICS_KEY, JSON.stringify(topics));
}

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const emptyApproach = () => ({ _key: crypto.randomUUID(), label: 'Approach', approach: '', timeComplexity: '', spaceComplexity: '', code: '' });
const defaultCard = {
  title: '', topic: '', subtopic: '', difficulty: 'Medium', problemLink: '', question: '',
  approaches: [],
  notes: '',
};

// ── Draft helpers ──────────────────────────────────────────
const DRAFT_KEY = 'dsa_card_draft';
function loadDraft() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY));
    if (!d) return null;
    // migrate old drafts that used brute/better/optimal instead of approaches
    if (!d.approaches) {
      const migrated = [];
      for (const [label, key] of [['Brute Force', 'brute'], ['Better', 'better'], ['Optimal', 'optimal']]) {
        const a = d[key];
        if (a && (a.approach || a.code || a.timeComplexity || a.spaceComplexity)) {
          migrated.push({ _key: crypto.randomUUID(), label, ...a });
        }
      }
      d.approaches = migrated;
    }
    return d;
  } catch { return null; }
}
function saveDraft(d) { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); }
function clearDraft() { localStorage.removeItem(DRAFT_KEY); }

// ── TopicSelect ────────────────────────────────────────────
function TopicSelect({ value, onChange }) {
  const [customTopics, setCustomTopics] = useState(loadCustomTopics);
  const allTopics = [...new Set([...DEFAULT_TOPICS, ...customTopics])].sort();

  const [open, setOpen] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [filter, setFilter] = useState('');
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const addCustomTopic = () => {
    const t = newTopic.trim();
    if (!t || allTopics.includes(t)) return;
    const updated = [...customTopics, t];
    setCustomTopics(updated);
    saveCustomTopics(updated);
    onChange(t);
    setNewTopic('');
    setOpen(false);
  };

  const removeCustomTopic = (t, e) => {
    e.stopPropagation();
    const updated = customTopics.filter((c) => c !== t);
    setCustomTopics(updated);
    saveCustomTopics(updated);
    if (value === t) onChange('');
  };

  const filtered = allTopics.filter((t) => t.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs text-zinc-500 mb-1">Topic *</label>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setFilter(''); }}
        className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-left focus:outline-none focus:border-emerald-600 hover:border-zinc-700 transition-colors"
      >
        <span className={value ? 'text-zinc-200' : 'text-zinc-600'}>{value || 'Select topic...'}</span>
        <ChevronDown size={14} className={`text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-zinc-800">
            <input
              autoFocus
              type="text"
              placeholder="Search topics..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full bg-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
            />
          </div>

          {/* Options */}
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-xs text-zinc-600 px-3 py-2">No match — add below</p>
            )}
            {filtered.map((t) => (
              <div
                key={t}
                onClick={() => { onChange(t); setOpen(false); }}
                className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors ${value === t ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-300 hover:bg-zinc-800'}`}
              >
                <span>{t}</span>
                {customTopics.includes(t) && (
                  <button
                    type="button"
                    onClick={(e) => removeCustomTopic(t, e)}
                    className="text-zinc-600 hover:text-red-400 transition-colors ml-2"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add new */}
          <div className="p-2 border-t border-zinc-800 flex gap-2">
            <input
              type="text"
              placeholder="Add new topic..."
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTopic())}
              className="flex-1 bg-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={addCustomTopic}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Approach section ───────────────────────────────────────
function ApproachSection({ value, onChange, onRemove }) {
  const [open, setOpen] = useState(!!value.approach || !!value.code);
  const patch = (key) => (v) => onChange({ ...value, [key]: v });
  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center bg-zinc-900 border-b border-zinc-800 group">
        <GripVertical size={14} className="text-zinc-700 ml-3 shrink-0" />
        <input
          type="text"
          value={value.label}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
          placeholder="Approach name"
          className="flex-1 bg-transparent px-3 py-3 text-sm font-medium text-zinc-300 placeholder:text-zinc-600 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="px-3 py-3 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="px-3 py-3 text-zinc-600 hover:text-red-400 transition-colors"
          title="Remove approach"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {open && (
        <div className="px-4 pb-4 pt-3 space-y-3 bg-zinc-900/50">
          <TextArea label="Approach / Explanation" value={value.approach} onChange={patch('approach')} rows={3} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Time Complexity" value={value.timeComplexity} onChange={patch('timeComplexity')} placeholder="O(n)" />
            <Input label="Space Complexity" value={value.spaceComplexity} onChange={patch('spaceComplexity')} placeholder="O(1)" />
          </div>
          <TextArea label="C++ Code" value={value.code} onChange={patch('code')} rows={8} mono />
        </div>
      )}
    </div>
  );
}

function Input({ label, value, onChange, placeholder, required }) {
  return (
    <div>
      <label className="block text-xs text-zinc-500 mb-1">{label}{required && ' *'}</label>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-600"
      />
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 4, mono }) {
  return (
    <div>
      {label && <label className="block text-xs text-zinc-500 mb-1">{label}</label>}
      <textarea
        value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
        className={`w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-600 resize-y ${mono ? 'font-mono' : ''}`}
      />
    </div>
  );
}

function Select({ label, value, onChange, options, required }) {
  return (
    <div>
      <label className="block text-xs text-zinc-500 mb-1">{label}{required && ' *'}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} required={required}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-emerald-600"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ── JSON import ────────────────────────────────────────────
const JSON_TEMPLATE = `{
  "title": "Two Sum",
  "topic": "Arrays",
  "subtopic": "Hashing",
  "difficulty": "Easy",
  "problemLink": "https://leetcode.com/problems/two-sum/",
  "question": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
  "approaches": [
    {
      "label": "Brute Force",
      "approach": "Check every pair using two nested loops.",
      "timeComplexity": "O(n²)",
      "spaceComplexity": "O(1)",
      "code": ""
    },
    {
      "label": "Optimal",
      "approach": "Use a hashmap to store each element's complement.",
      "timeComplexity": "O(n)",
      "spaceComplexity": "O(n)",
      "code": ""
    }
  ],
  "notes": "HashMap approach is the standard interview solution."
}`;

const ALLOWED_CARD_KEYS = new Set(['title', 'topic', 'subtopic', 'difficulty', 'problemLink', 'question', 'approaches', 'notes']);
const ALLOWED_APPROACH_KEYS = new Set(['label', 'approach', 'timeComplexity', 'spaceComplexity', 'code']);
const VALID_DIFFICULTIES = new Set(['Easy', 'Medium', 'Hard']);

function parseJsonCard(text) {
  let raw;
  try { raw = JSON.parse(text); } catch (e) { throw new Error('Invalid JSON: ' + e.message); }
  if (Array.isArray(raw)) throw new Error('Paste a single card object { ... }, not an array [ ... ]');
  if (typeof raw !== 'object' || raw === null) throw new Error('JSON must be an object');

  const unknown = Object.keys(raw).filter((k) => !ALLOWED_CARD_KEYS.has(k));
  if (unknown.length) throw new Error(`Unknown field(s): ${unknown.join(', ')}`);
  if (!raw.title?.trim()) throw new Error('"title" is required');
  if (!raw.topic?.trim()) throw new Error('"topic" is required');
  if (!VALID_DIFFICULTIES.has(raw.difficulty)) throw new Error('"difficulty" must be Easy, Medium, or Hard');

  const approaches = (raw.approaches ?? []).map((a, i) => {
    if (typeof a !== 'object' || Array.isArray(a)) throw new Error(`approaches[${i}] must be an object`);
    const uk = Object.keys(a).filter((k) => !ALLOWED_APPROACH_KEYS.has(k));
    if (uk.length) throw new Error(`approaches[${i}] unknown field(s): ${uk.join(', ')}`);
    return {
      _key: crypto.randomUUID(),
      label: typeof a.label === 'string' && a.label.trim() ? a.label.trim() : `Approach ${i + 1}`,
      approach: a.approach ?? '',
      timeComplexity: a.timeComplexity ?? '',
      spaceComplexity: a.spaceComplexity ?? '',
      code: a.code ?? '',
    };
  });

  let notes = '';
  if (Array.isArray(raw.notes)) notes = raw.notes.map(String).join('\n');
  else if (typeof raw.notes === 'string') notes = raw.notes;

  return {
    title: raw.title.trim(),
    topic: raw.topic.trim(),
    subtopic: typeof raw.subtopic === 'string' ? raw.subtopic.trim() : '',
    difficulty: raw.difficulty,
    problemLink: typeof raw.problemLink === 'string' ? raw.problemLink.trim() : '',
    question: typeof raw.question === 'string' ? raw.question.trim() : '',
    approaches,
    notes,
  };
}

// ── Main form ──────────────────────────────────────────────
export default function CardForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { createCard, updateCard } = useCardStore();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(() => isEdit ? defaultCard : (loadDraft() ?? defaultCard));
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState('form'); // 'form' | 'json'
  const [jsonText, setJsonText] = useState(JSON_TEMPLATE);
  const [jsonError, setJsonError] = useState('');
  // Only show banner if draft has meaningful content (user actually typed something)
  const [hasDraft, setHasDraft] = useState(() => {
    if (isEdit) return false;
    const d = loadDraft();
    return !!(d && (d.title || d.topic || d.question));
  });

  useEffect(() => {
    if (!isEdit) return;
    cardsApi.getOne(id).then(({ data }) => {
      setForm({
        title: data.title ?? '',
        topic: data.topic ?? '',
        subtopic: data.subtopic ?? '',
        difficulty: data.difficulty ?? 'Medium',
        problemLink: data.problemLink ?? '',
        question: data.question ?? '',
        approaches: (data.approaches ?? []).map((a) => ({ _key: crypto.randomUUID(), ...a })),
        notes: data.notes ?? '',
      });
    }).catch(() => toast.error('Failed to load card'));
  }, [id]);

  useEffect(() => {
    if (isEdit) return;
    saveDraft(form);
  }, [form, isEdit]);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const addApproach = () => setForm((f) => ({ ...f, approaches: [...(f.approaches ?? []), emptyApproach()] }));

  const updateApproach = (i, val) => setForm((f) => {
    const approaches = (f.approaches ?? []).map((a, idx) => idx === i ? val : a);
    return { ...f, approaches };
  });

  const removeApproach = (i) => setForm((f) => ({
    ...f, approaches: (f.approaches ?? []).filter((_, idx) => idx !== i),
  }));

  const applyJson = () => {
    try {
      const parsed = parseJsonCard(jsonText);
      setForm(parsed);
      setJsonError('');
      setMode('form');
      toast.success('JSON loaded — review and save');
    } catch (e) {
      setJsonError(e.message);
    }
  };

  const discardDraft = () => {
    clearDraft();
    setForm(defaultCard);
    setHasDraft(false);
    toast.success('Draft discarded');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.topic) { toast.error('Please select a topic'); return; }
    setSaving(true);
    const payload = {
      ...form,
      approaches: form.approaches.map(({ _key, ...a }) => a),
    };
    try {
      if (isEdit) await updateCard(id, payload);
      else { await createCard(payload); clearDraft(); }
      navigate('/cards');
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-zinc-500 hover:text-zinc-200 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-bold text-zinc-100">{isEdit ? 'Edit Card' : 'New Card'}</h1>
        {!isEdit && (
          <div className="ml-auto flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setMode('form')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === 'form' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <LayoutList size={13} /> Form
            </button>
            <button
              type="button"
              onClick={() => { setMode('json'); setJsonError(''); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === 'json' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Braces size={13} /> JSON
            </button>
          </div>
        )}
      </div>

      {hasDraft && !isEdit && mode === 'form' && (
        <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 text-sm">
          <span className="text-amber-400">Draft restored from your last session.</span>
          <button type="button" onClick={discardDraft} className="text-xs text-amber-500 hover:text-amber-300 underline underline-offset-2">Discard</button>
        </div>
      )}

      {mode === 'json' && (
        <div className="space-y-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Paste Card JSON</h2>
              <button
                type="button"
                onClick={() => { setJsonText(JSON_TEMPLATE); setJsonError(''); }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Reset to template
              </button>
            </div>
            <textarea
              value={jsonText}
              onChange={(e) => { setJsonText(e.target.value); setJsonError(''); }}
              rows={22}
              spellCheck={false}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-600 resize-y"
            />
            {jsonError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{jsonError}</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pb-6">
            <Button type="button" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="button" variant="primary" onClick={applyJson}>
              <Braces size={13} /> Load into Form
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`space-y-5 ${mode === 'json' ? 'hidden' : ''}`}>
        {/* Basic Info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Basic Info</h2>
          <Input label="Title" value={form.title} onChange={set('title')} required placeholder="Two Sum" />
          <div className="grid grid-cols-2 gap-4">
            <TopicSelect value={form.topic} onChange={set('topic')} />
            <Select label="Difficulty" value={form.difficulty} onChange={set('difficulty')} options={DIFFICULTIES} required />
          </div>
          <Input label="Subtopic" value={form.subtopic} onChange={set('subtopic')} placeholder="e.g. Prefix Sum, Kadane's Algorithm" />
          <Input label="Problem Link" value={form.problemLink} onChange={set('problemLink')} placeholder="https://leetcode.com/problems/..." />
        </div>

        {/* Question */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Problem Statement</h2>
          <TextArea value={form.question} onChange={set('question')} rows={5} placeholder="Describe the problem..." />
        </div>

        {/* Approaches */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Approaches</h2>
            <button
              type="button"
              onClick={addApproach}
              className="flex items-center gap-1.5 text-xs text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              <Plus size={13} /> Add Approach
            </button>
          </div>
          {(form.approaches ?? []).length === 0 && (
            <p className="text-xs text-zinc-600 px-1">No approaches yet. Click "Add Approach" to add one.</p>
          )}
          {(form.approaches ?? []).map((a, i) => (
            <ApproachSection
              key={a._key}
              value={a}
              onChange={(val) => updateApproach(i, val)}
              onRemove={() => removeApproach(i)}
            />
          ))}
        </div>

        {/* Notes */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Notes</h2>
          <TextArea value={form.notes} onChange={set('notes')} rows={3} placeholder="Key patterns, tips, tricky parts..." />
        </div>

        <div className="flex justify-end gap-3 pb-6">
          <Button type="button" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Card'}
          </Button>
        </div>
      </form>
    </div>
  );
}
