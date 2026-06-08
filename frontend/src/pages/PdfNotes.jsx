import { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Trash2, RefreshCw, X, BookOpen, Pencil, Search, ChevronLeft, ChevronRight, Eye, Filter, ChevronDown, ChevronRight as ChevronRightIcon, Check, Archive, ArchiveRestore } from 'lucide-react';
import { TopicBadge } from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import { pdfNotesApi } from '../utils/api.js';
import useSettings from '../store/useSettings.js';
import toast from 'react-hot-toast';
import CreatableSelect from '../components/ui/CreatableSelect.jsx';

const DEFAULT_TOPICS = [
  'Arrays', 'Strings', 'Linked List', 'Stacks & Queues', 'Trees', 'Graphs',
  'Dynamic Programming', 'Greedy', 'Binary Search', 'Backtracking', 'Heap',
  'Trie', 'Sliding Window', 'Two Pointers', 'Math', 'Bit Manipulation', 'Other',
];

function emptySection() {
  return { startPage: '', endPage: '', subtopic: '', title: '', difficulty: '' };
}

function normalizeSections(rows) {
  return rows
    .map((r) => {
      const start = parseInt(r.startPage, 10);
      const end = r.endPage === '' || r.endPage == null ? start : parseInt(r.endPage, 10);
      const difficulty = ['Easy', 'Medium', 'Hard'].includes(r.difficulty) ? r.difficulty : '';
      return { startPage: start, endPage: end, subtopic: (r.subtopic ?? '').trim(), title: (r.title ?? '').trim(), difficulty };
    })
    .filter((r) => Number.isInteger(r.startPage) && r.startPage >= 1);
}

function validateSections(sections) {
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (!Number.isInteger(s.endPage) || s.endPage < s.startPage) {
      return `Section ${i + 1}: end page must be ≥ start page`;
    }
    if (!s.subtopic) {
      return `Section ${i + 1}: subtopic is required`;
    }
  }
  return null;
}

const inputCls =
  'w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-flat-blue-500';

function SectionsEditor({ sections, setSections }) {
  const updateSection = (i, key, value) =>
    setSections((prev) => prev.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)));
  const addSection = () => setSections((prev) => [...prev, emptySection()]);
  const removeSection = (i) => setSections((prev) => prev.filter((_, idx) => idx !== i));

  const numInputCls = `bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-flat-blue-500 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Sections</span>
        <button type="button" onClick={addSection} className="text-xs text-flat-blue-500 hover:text-flat-blue-600 font-semibold flex items-center gap-1">
          <Plus size={12} /> Add section
        </button>
      </div>
      <div className="space-y-3">
        {sections.map((s, i) => (
          <div key={i} className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 space-y-2">
            {/* Page range row */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Start</label>
                <input
                  type="number" min="1" value={s.startPage}
                  onChange={(e) => updateSection(i, 'startPage', e.target.value)}
                  placeholder="1"
                  className={numInputCls}
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">End</label>
                <input
                  type="number" min="1" value={s.endPage}
                  onChange={(e) => updateSection(i, 'endPage', e.target.value)}
                  placeholder={s.startPage || '1'}
                  className={numInputCls}
                />
              </div>
              <button
                type="button"
                onClick={() => removeSection(i)}
                className="self-end mb-0.5 p-1.5 text-zinc-400 hover:text-red-500 transition-colors shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
            {/* Subtopic row */}
            <CreatableSelect
              label="Subtopic *"
              value={s.subtopic}
              onChange={(v) => updateSection(i, 'subtopic', v)}
              storageKey="dsa_custom_subtopics"
              placeholder="e.g. Memoization, Graph BFS…"
              required
            />
            {/* Title + Difficulty row */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-zinc-500 mb-1">Title</label>
                <input
                  value={s.title}
                  onChange={(e) => updateSection(i, 'title', e.target.value)}
                  placeholder="e.g. Notes on Knapsack Problem"
                  className={inputCls}
                />
              </div>
              <div className="w-28">
                <label className="block text-xs text-zinc-500 mb-1">Difficulty</label>
                <select
                  value={s.difficulty}
                  onChange={(e) => updateSection(i, 'difficulty', e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-flat-blue-500"
                >
                  <option value="">—</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>
          </div>
        ))}
        {sections.length === 0 && (
          <p className="text-xs text-zinc-400 italic">No sections yet. Click "Add section" to create one.</p>
        )}
      </div>
      <p className="text-xs text-zinc-400 mt-2">Same number for Start and End = single page.</p>
    </div>
  );
}

function CreateModal({ onClose, onCreated }) {
  const [mode, setMode] = useState('upload');
  const [topic, setTopic] = useState('');
  const [driveLink, setDriveLink] = useState('');
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);
  const [sections, setSections] = useState([emptySection()]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!topic.trim()) { setError('Topic is required'); return; }
    if (mode === 'upload' && !file) { setError('Choose a PDF file to upload'); return; }
    if (mode === 'drive' && !driveLink.trim()) { setError('Paste a Google Drive link'); return; }

    const normalized = normalizeSections(sections);
    const sectionError = validateSections(normalized);
    if (sectionError) { setError(sectionError); return; }

    setLoading(true);
    try {
      if (mode === 'upload') {
        const fd = new FormData();
        fd.append('topic', topic.trim());
        fd.append('sections', JSON.stringify(normalized));
        fd.append('pdf', file);
        await pdfNotesApi.createUpload(fd);
      } else {
        await pdfNotesApi.createDrive({
          topic: topic.trim(),
          driveLink: driveLink.trim(),
          sections: normalized,
        });
      }
      toast.success('PDF note created');
      onCreated();
      onClose();
    } catch (e) {
      const msg = e.response?.data?.error ?? e.message ?? 'Upload failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', padding: 16 }}>
      <div style={{ background: 'var(--modal-bg, white)', borderRadius: 16, width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', maxHeight: '90vh', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }} className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700">

        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">New PDF Note</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"><X size={16} /></button>
        </div>

        <div style={{ overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Mode tabs */}
          <div className="flex gap-2">
            {['upload', 'drive'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${mode === m ? 'bg-flat-blue-50 dark:bg-flat-blue-600/10 text-flat-blue-600 dark:text-flat-blue-500 border-flat-blue-500/40' : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'}`}
              >
                {m === 'upload' ? 'Upload PDF' : 'Google Drive link'}
              </button>
            ))}
          </div>

          {/* Topic */}
          <CreatableSelect
            label="Topic"
            value={topic}
            onChange={setTopic}
            defaultOptions={DEFAULT_TOPICS}
            storageKey="dsa_custom_topics"
            placeholder="e.g. Dynamic Programming"
            required
          />

          {/* File source */}
          {mode === 'upload' ? (
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1">PDF file *</label>
              <input ref={fileRef} type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
              <div
                onClick={() => fileRef.current.click()}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${file ? 'border-flat-blue-400 bg-flat-blue-50 dark:bg-flat-blue-600/10' : 'border-zinc-300 dark:border-zinc-700 hover:border-flat-blue-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
              >
                <div className="w-8 h-8 rounded-lg bg-flat-blue-100 dark:bg-flat-blue-600/20 flex items-center justify-center shrink-0">
                  <FileText size={16} className="text-flat-blue-600 dark:text-flat-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  {file ? (
                    <>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{file.name}</p>
                      <p className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Click to select a PDF</p>
                      <p className="text-xs text-zinc-400">PDF files only</p>
                    </>
                  )}
                </div>
                {file && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); fileRef.current.value = ''; }} className="text-zinc-400 hover:text-red-500 transition-colors">
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1">Google Drive link *</label>
              <input value={driveLink} onChange={(e) => setDriveLink(e.target.value)} placeholder="https://drive.google.com/file/d/.../view" className={inputCls} />
              <p className="text-xs text-zinc-400 mt-1">Set sharing to "Anyone with the link". The PDF is downloaded and stored locally.</p>
            </div>
          )}

          <SectionsEditor sections={sections} setSections={setSections} />

          {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-zinc-200 dark:border-zinc-800">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving…' : 'Create'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function EditModal({ note, onClose, onSaved }) {
  const [topic, setTopic] = useState(note.topic);
  const [title, setTitle] = useState(note.title ?? '');
  const [subtopic, setSubtopic] = useState(note.subtopic ?? '');
  const [difficulty, setDifficulty] = useState(note.difficulty ?? '');
  const [startPage, setStartPage] = useState(String(note.startPage ?? 1));
  const [endPage, setEndPage] = useState(String(note.endPage ?? note.startPage ?? 1));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!topic.trim()) { setError('Topic is required'); return; }
    const start = parseInt(startPage, 10);
    const end = endPage === '' ? start : parseInt(endPage, 10);
    if (!Number.isInteger(start) || start < 1) { setError('Start page must be ≥ 1'); return; }
    if (!Number.isInteger(end) || end < start) { setError('End page must be ≥ start page'); return; }

    setLoading(true);
    try {
      const { data } = await pdfNotesApi.update(note._id, {
        topic: topic.trim(),
        title: title.trim(),
        subtopic: subtopic.trim(),
        difficulty,
        startPage: start,
        endPage: end,
      });
      toast.success('Saved');
      onSaved(data);
      onClose();
    } catch (e) {
      const msg = e.response?.data?.error ?? e.message ?? 'Save failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', padding: 16 }}>
      <div style={{ background: 'var(--modal-bg, white)', borderRadius: 16, width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', maxHeight: '90vh', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }} className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700">

        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Edit PDF Note</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"><X size={16} /></button>
        </div>

        <div style={{ overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Topic + Subtopic */}
          <div className="grid grid-cols-2 gap-3">
            <CreatableSelect
              label="Topic"
              value={topic}
              onChange={setTopic}
              defaultOptions={DEFAULT_TOPICS}
              storageKey="dsa_custom_topics"
              placeholder="e.g. Dynamic Programming"
              required
            />
            <CreatableSelect
              label="Subtopic (optional)"
              value={subtopic}
              onChange={setSubtopic}
              storageKey="dsa_custom_subtopics"
              placeholder="e.g. Memoization, Knapsack"
            />
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Start</label>
                <input
                  type="number" min="1" value={startPage}
                  onChange={(e) => setStartPage(e.target.value)}
                  placeholder="1"
                  className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-flat-blue-500 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">End</label>
                <input
                  type="number" min="1" value={endPage}
                  onChange={(e) => setEndPage(e.target.value)}
                  placeholder={startPage || '1'}
                  className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-flat-blue-500 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Memoization, Graph BFS…" className={inputCls} />
              </div>
              <div className="w-28">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-flat-blue-500"
                >
                  <option value="">—</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-zinc-200 dark:border-zinc-800">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function NoteCard({ note, onOpen, onEdit, onRefresh, onDelete, onToggleArchive }) {
  const confirmDelete = useSettings((s) => s.confirmDelete);
  const [confirming, setConfirming] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleDelete = (e) => {
    e.stopPropagation();
    if (!confirmDelete) { onDelete(); return; }
    if (confirming) { onDelete(); setConfirming(false); }
    else { setConfirming(true); setTimeout(() => setConfirming(false), 2500); }
  };

  const handleRefresh = async (e) => {
    e.stopPropagation();
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  };

  const BOX_THRESHOLD_DAYS = { 0: 0, 1: 3, 2: 7, 3: 12 };
  const daysSince = note.lastReviewed ? (Date.now() - new Date(note.lastReviewed).getTime()) / 86_400_000 : Infinity;
  const isDue = !note.archived && daysSince >= (BOX_THRESHOLD_DAYS[note.boxLevel] ?? 0);

  const pdfName = note.originalName || (note.fileName ? note.fileName.replace(/^\d+-[a-f0-9]+-?/, '') : '');
  const boxColors = ['bg-zinc-100 dark:bg-zinc-800 text-zinc-500', 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400', 'bg-flat-green-50 dark:bg-flat-green-900/20 text-flat-green-600 dark:text-flat-green-400', 'bg-flat-blue-50 dark:bg-flat-blue-900/20 text-flat-blue-600 dark:text-flat-blue-400'];
  const boxColor = boxColors[note.boxLevel ?? 0] ?? boxColors[0];
  const total = (note.passCount ?? 0) + (note.failCount ?? 0);
  const passRate = total > 0 ? Math.round(((note.passCount ?? 0) / total) * 100) : null;

  return (
    <div
      onClick={onOpen}
      className={`bg-white dark:bg-zinc-900 border rounded-xl px-4 py-3 flex items-center gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group cursor-pointer ${note.archived ? 'border-zinc-300 dark:border-zinc-700 opacity-60' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
    >
      <FileText size={18} className="text-flat-blue-500 shrink-0" />

      {/* Left: title + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{note.title || note.topic}</span>
          {note.archived && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-600 shrink-0">ARCHIVED</span>}
          {!note.archived && isDue && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">DUE</span>}
          {note.weak && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">WEAK</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {pdfName && <span className="text-[11px] text-zinc-400 truncate max-w-[140px]">{pdfName}</span>}
          <TopicBadge topic={note.subtopic ? `${note.topic} › ${note.subtopic}` : note.topic} />
          {note.difficulty && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
              note.difficulty === 'Easy' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' :
              note.difficulty === 'Medium' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' :
              'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400'
            }`}>{note.difficulty}</span>
          )}
          <span className="text-[11px] font-mono text-zinc-400 shrink-0">
            {note.startPage === note.endPage ? `p.${note.startPage}` : `pp.${note.startPage}–${note.endPage}`}
          </span>
        </div>
      </div>

      {/* Right: stats column */}
      <div className="shrink-0 flex flex-col items-end gap-1.5">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${boxColor}`}>
          Box {note.boxLevel ?? 0}
        </span>
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1 text-[11px] text-zinc-400" title="Views">
            <Eye size={10} />{note.visitCount ?? 0}
          </span>
          <span className="text-[11px] font-semibold text-flat-green-600 dark:text-flat-green-400" title="Got it">
            ✓ {note.passCount ?? 0}
          </span>
          <span className="text-[11px] font-semibold text-red-400" title="Missed">
            ✗ {note.failCount ?? 0}
          </span>
          {passRate !== null && (
            <span className="text-[11px] text-zinc-400 tabular-nums">{passRate}%</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button variant="ghost" className="px-2 py-1" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Edit note">
          <Pencil size={13} />
        </Button>
        {note.sourceType === 'drive' && (
          <Button variant="ghost" className="px-2 py-1" onClick={handleRefresh} disabled={refreshing} title="Re-download from Drive">
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          </Button>
        )}
        <Button
          variant="ghost"
          className="px-2 py-1"
          onClick={(e) => { e.stopPropagation(); onToggleArchive(); }}
          title={note.archived ? 'Unarchive (return to review queue)' : 'Archive (exclude from review queues)'}
        >
          {note.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
        </Button>
        <Button variant={confirming ? 'danger' : 'ghost'} className="px-2 py-1" onClick={handleDelete}>
          <Trash2 size={13} />
          {confirming && <span className="text-xs">Confirm</span>}
        </Button>
      </div>
    </div>
  );
}

// Single dialog for topic + subtopic filtering
function FilterDialog({ topics, filters, onChange, onClose }) {
  const [expandedTopics, setExpandedTopics] = useState(() => {
    const set = new Set(filters.topic);
    return set;
  });
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const toggleExpand = (topic) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topic)) next.delete(topic); else next.add(topic);
      return next;
    });
  };

  const toggleTopic = (topic) => {
    const isSelected = filters.topic.includes(topic);
    if (isSelected) {
      const topicSubtopics = topics.find(t => t.topic === topic)?.subtopics ?? [];
      onChange({
        topic: filters.topic.filter(t => t !== topic),
        subtopic: filters.subtopic.filter(s => !topicSubtopics.includes(s)),
      });
    } else {
      onChange({ topic: [...filters.topic, topic], subtopic: filters.subtopic });
      setExpandedTopics(prev => new Set([...prev, topic]));
    }
  };

  const toggleSubtopic = (sub) => {
    const isSelected = filters.subtopic.includes(sub);
    onChange({
      topic: filters.topic,
      subtopic: isSelected ? filters.subtopic.filter(s => s !== sub) : [...filters.subtopic, sub],
    });
  };

  const clearAll = () => onChange({ topic: [], subtopic: [] });
  const totalSelected = filters.topic.length + filters.subtopic.length;

  return (
    <div ref={ref} className="absolute right-0 top-full mt-1 z-50 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Filter by Topic</span>
        {totalSelected > 0 && (
          <button onClick={clearAll} className="text-xs text-flat-blue-500 hover:text-flat-blue-600 font-medium">Clear all</button>
        )}
      </div>
      <div className="max-h-72 overflow-y-auto py-1">
        {topics.length === 0 && (
          <div className="px-3 py-3 text-sm text-zinc-500 italic">No topics yet</div>
        )}
        {topics.map(({ topic, subtopics }) => {
          const topicSelected = filters.topic.includes(topic);
          const expanded = expandedTopics.has(topic);
          const selectedSubCount = subtopics.filter(s => filters.subtopic.includes(s)).length;
          return (
            <div key={topic}>
              <div className="flex items-center gap-1 px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                <button
                  type="button"
                  onClick={() => toggleTopic(topic)}
                  className={`flex-1 flex items-center gap-2 text-sm text-left rounded transition-colors ${topicSelected ? 'text-flat-blue-600 dark:text-flat-blue-400 font-medium' : 'text-zinc-700 dark:text-zinc-300'}`}
                >
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${topicSelected ? 'bg-flat-blue-500 border-flat-blue-500' : 'border-zinc-300 dark:border-zinc-600'}`}>
                    {topicSelected && <Check size={10} className="text-white" />}
                  </span>
                  <span className="truncate">{topic}</span>
                  {selectedSubCount > 0 && (
                    <span className="ml-auto text-xs bg-flat-blue-100 dark:bg-flat-blue-900/40 text-flat-blue-600 dark:text-flat-blue-400 rounded-full px-1.5 py-0.5 shrink-0">{selectedSubCount}</span>
                  )}
                </button>
                {subtopics.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(topic)}
                    className="p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                  >
                    {expanded ? <ChevronDown size={13} /> : <ChevronRightIcon size={13} />}
                  </button>
                )}
              </div>
              {expanded && subtopics.length > 0 && (
                <div className="ml-6 border-l border-zinc-100 dark:border-zinc-800 pl-2">
                  {subtopics.map(sub => {
                    const subSelected = filters.subtopic.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => toggleSubtopic(sub)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left rounded hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${subSelected ? 'text-flat-blue-600 dark:text-flat-blue-400 font-medium' : 'text-zinc-600 dark:text-zinc-400'}`}
                      >
                        <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${subSelected ? 'bg-flat-blue-500 border-flat-blue-500' : 'border-zinc-300 dark:border-zinc-600'}`}>
                          {subSelected && <Check size={9} className="text-white" />}
                        </span>
                        <span className="truncate">{sub}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const SORT_OPTIONS = [
  { value: 'newest',   label: 'Newest' },
  { value: 'views',    label: 'Most viewed' },
  { value: 'pass',     label: 'Most correct' },
  { value: 'fail',     label: 'Most missed' },
  { value: 'passrate', label: 'Pass rate ↑' },
  { value: 'failrate', label: 'Fail rate ↑' },
  { value: 'box_asc',  label: 'Box ↑ (weakest first)' },
  { value: 'box_desc', label: 'Box ↓ (strongest first)' },
];

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const BOXES = [0, 1, 2, 3];

export default function PdfNotes() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editNote, setEditNote] = useState(null);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filters, setFilters] = useState({ search: '', topic: [], subtopic: [], difficulty: [], box: [] });
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const { data } = await pdfNotesApi.getAll();
      setNotes(data);
    } catch (e) {
      toast.error(e.response?.data?.error ?? 'Failed to load PDF notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotes(); }, []);

  const handleDelete = async (id) => {
    try {
      await pdfNotesApi.remove(id);
      setNotes((prev) => prev.filter((n) => n._id !== id));
      toast.success('Deleted');
    } catch (e) {
      toast.error(e.response?.data?.error ?? 'Delete failed');
    }
  };

  const handleRefresh = async (id) => {
    try {
      await pdfNotesApi.refresh(id);
      toast.success('Re-downloaded from Drive');
      fetchNotes();
    } catch (e) {
      toast.error(e.response?.data?.error ?? 'Refresh failed');
    }
  };

  const handleSaved = (updated) => {
    setNotes((prev) => prev.map((n) => (n._id === updated._id ? updated : n)));
  };

  const handleToggleArchive = async (id, currentArchived) => {
    try {
      const { data } = await pdfNotesApi.update(id, { archived: !currentArchived });
      setNotes((prev) => prev.map((n) => (n._id === id ? data : n)));
      toast.success(currentArchived ? 'Unarchived — back in review queues' : 'Archived — excluded from review queues');
    } catch (e) {
      toast.error(e.response?.data?.error ?? 'Failed to update');
    }
  };

  const topics = useMemo(() => {
    const tMap = new Map();
    notes.forEach(n => {
      if (!n.topic) return;
      if (!tMap.has(n.topic)) tMap.set(n.topic, new Set());
      if (n.subtopic) tMap.get(n.topic).add(n.subtopic);
    });
    return Array.from(tMap.entries()).map(([topic, subtopics]) => ({
      topic,
      subtopics: Array.from(subtopics)
    })).sort((a, b) => a.topic.localeCompare(b.topic));
  }, [notes]);

  const filteredNotes = useMemo(() => {
    let result = notes.filter(n => {
      if (filters.topic?.length > 0 && !filters.topic.includes(n.topic)) return false;
      if (filters.subtopic?.length > 0 && !filters.subtopic.includes(n.subtopic)) return false;
      if (filters.difficulty?.length > 0 && !filters.difficulty.includes(n.difficulty)) return false;
      if (filters.box?.length > 0 && !filters.box.includes(n.boxLevel ?? 0)) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        return (n.topic?.toLowerCase().includes(q) || n.subtopic?.toLowerCase().includes(q) || n.title?.toLowerCase().includes(q));
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      const aTotal = (a.passCount ?? 0) + (a.failCount ?? 0);
      const bTotal = (b.passCount ?? 0) + (b.failCount ?? 0);
      switch (sort) {
        case 'views':    return (b.visitCount ?? 0) - (a.visitCount ?? 0);
        case 'pass':     return (b.passCount ?? 0) - (a.passCount ?? 0);
        case 'fail':     return (b.failCount ?? 0) - (a.failCount ?? 0);
        case 'passrate': return (bTotal ? (b.passCount ?? 0) / bTotal : 0) - (aTotal ? (a.passCount ?? 0) / aTotal : 0);
        case 'failrate': return (bTotal ? (b.failCount ?? 0) / bTotal : 0) - (aTotal ? (a.failCount ?? 0) / aTotal : 0);
        case 'box_asc':  return (a.boxLevel ?? 0) - (b.boxLevel ?? 0);
        case 'box_desc': return (b.boxLevel ?? 0) - (a.boxLevel ?? 0);
        default:         return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    return result;
  }, [notes, filters, sort]);

  const pages = Math.ceil(filteredNotes.length / pageSize) || 1;
  const paginatedNotes = filteredNotes.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > pages && pages > 0) setPage(pages);
  }, [pages, page]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={fetchNotes} />}
      {editNote && <EditModal note={editNote} onClose={() => setEditNote(null)} onSaved={handleSaved} />}

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          PDF Notes <span className="text-zinc-600 text-lg font-normal">({filteredNotes.length})</span>
        </h1>
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          <Plus size={14} /> New PDF Note
        </Button>
      </div>

      <div className="space-y-2">
        {/* Row 1: search + topic filter + sort */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by title, topic, subtopic..."
              value={filters.search}
              onChange={(e) => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-flat-blue-500"
            />
          </div>

          {/* Topic + subtopic filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilterDialog(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors focus:outline-none ${
                filters.topic.length > 0 || filters.subtopic.length > 0
                  ? 'bg-flat-blue-50 dark:bg-flat-blue-900/20 border-flat-blue-400 text-flat-blue-600 dark:text-flat-blue-400'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <Filter size={14} />
              <span>
                {filters.topic.length === 0 && filters.subtopic.length === 0
                  ? 'Topic'
                  : `${filters.topic.length + filters.subtopic.length} topic filter${filters.topic.length + filters.subtopic.length > 1 ? 's' : ''}`}
              </span>
              <ChevronDown size={13} className={`transition-transform ${showFilterDialog ? 'rotate-180' : ''}`} />
            </button>
            {showFilterDialog && (
              <FilterDialog
                topics={topics}
                filters={filters}
                onChange={(next) => { setFilters(f => ({ ...f, ...next })); setPage(1); }}
                onClose={() => setShowFilterDialog(false)}
              />
            )}
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-flat-blue-500"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Row 2: difficulty chips + box chips */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Difficulty:</span>
          {DIFFICULTIES.map(d => {
            const active = filters.difficulty.includes(d);
            const cls = d === 'Easy'
              ? active ? 'bg-green-500 text-white border-green-500' : 'border-green-200 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
              : d === 'Medium'
              ? active ? 'bg-amber-500 text-white border-amber-500' : 'border-amber-200 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
              : active ? 'bg-red-500 text-white border-red-500' : 'border-red-200 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20';
            return (
              <button
                key={d}
                onClick={() => {
                  setFilters(f => ({
                    ...f,
                    difficulty: f.difficulty.includes(d) ? f.difficulty.filter(x => x !== d) : [...f.difficulty, d]
                  }));
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-full border text-xs font-bold transition-all ${cls}`}
              >
                {d}
              </button>
            );
          })}

          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-2">Box:</span>
          {BOXES.map(b => {
            const active = filters.box.includes(b);
            const colorActive = b === 0 ? 'bg-zinc-500 text-white border-zinc-500'
              : b === 1 ? 'bg-amber-500 text-white border-amber-500'
              : b === 2 ? 'bg-green-500 text-white border-green-500'
              : 'bg-flat-blue-500 text-white border-flat-blue-500';
            const colorIdle = b === 0 ? 'border-zinc-300 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              : b === 1 ? 'border-amber-200 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
              : b === 2 ? 'border-green-200 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
              : 'border-flat-blue-200 text-flat-blue-600 dark:text-flat-blue-400 hover:bg-flat-blue-50 dark:hover:bg-flat-blue-900/20';
            return (
              <button
                key={b}
                onClick={() => {
                  setFilters(f => ({
                    ...f,
                    box: f.box.includes(b) ? f.box.filter(x => x !== b) : [...f.box, b]
                  }));
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-full border text-xs font-bold transition-all ${active ? colorActive : colorIdle}`}
              >
                Box {b}
              </button>
            );
          })}

          {/* Clear all filters */}
          {(filters.difficulty.length > 0 || filters.box.length > 0 || filters.topic.length > 0 || filters.subtopic.length > 0 || filters.search) && (
            <button
              onClick={() => { setFilters({ search: '', topic: [], subtopic: [], difficulty: [], box: [] }); setSort('newest'); setPage(1); }}
              className="ml-auto text-xs text-zinc-400 hover:text-red-500 transition-colors font-medium"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-zinc-600">Loading…</div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-16 text-zinc-600">
          <BookOpen size={32} className="mx-auto mb-3 text-zinc-400" />
          <p>No PDF notes found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginatedNotes.map((note) => (
            <NoteCard
              key={note._id}
              note={note}
              onOpen={() => navigate(`/pdf-notes/${note._id}`)}
              onEdit={() => setEditNote(note)}
              onRefresh={() => handleRefresh(note._id)}
              onDelete={() => handleDelete(note._id)}
              onToggleArchive={() => handleToggleArchive(note._id, note.archived)}
            />
          ))}
        </div>
      )}

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
