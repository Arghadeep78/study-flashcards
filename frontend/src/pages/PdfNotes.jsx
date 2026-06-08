import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Trash2, RefreshCw, X, BookOpen, Pencil } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import { pdfNotesApi } from '../utils/api.js';
import useSettings from '../store/useSettings.js';
import toast from 'react-hot-toast';

function emptySection() {
  return { startPage: '', endPage: '', subtopic: '' };
}

function normalizeSections(rows) {
  return rows
    .map((r) => {
      const start = parseInt(r.startPage, 10);
      // blank End → same as Start (single page)
      const end = r.endPage === '' || r.endPage == null ? start : parseInt(r.endPage, 10);
      return { startPage: start, endPage: end, subtopic: (r.subtopic ?? '').trim() };
    })
    .filter((r) => Number.isInteger(r.startPage) && r.startPage >= 1);
}

function validateSections(sections) {
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (!Number.isInteger(s.endPage) || s.endPage < s.startPage) {
      return `Section ${i + 1}: end page must be ≥ start page`;
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
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Subtopic</label>
              <input
                value={s.subtopic}
                onChange={(e) => updateSection(i, 'subtopic', e.target.value)}
                placeholder="e.g. Memoization, Graph BFS…"
                className={inputCls}
              />
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
  const [title, setTitle] = useState('');
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
        fd.append('title', title.trim());
        fd.append('sections', JSON.stringify(normalized));
        fd.append('pdf', file);
        await pdfNotesApi.createUpload(fd);
      } else {
        await pdfNotesApi.createDrive({
          topic: topic.trim(),
          title: title.trim(),
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

          {/* Topic + Title */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1">Topic *</label>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Dynamic Programming" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1">Title (optional)</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. DP Master Notes" className={inputCls} />
            </div>
          </div>

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
  const [sections, setSections] = useState(
    (note.sections ?? []).map((s) => ({
      startPage: String(s.startPage),
      endPage: String(s.endPage),
      subtopic: s.subtopic ?? '',
    }))
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!topic.trim()) { setError('Topic is required'); return; }

    const normalized = normalizeSections(sections);
    const sectionError = validateSections(normalized);
    if (sectionError) { setError(sectionError); return; }

    setLoading(true);
    try {
      const { data } = await pdfNotesApi.update(note._id, {
        topic: topic.trim(),
        title: title.trim(),
        sections: normalized,
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
          {/* Topic + Title */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1">Topic *</label>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Dynamic Programming" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1">Title (optional)</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. DP Master Notes" className={inputCls} />
            </div>
          </div>

          <SectionsEditor sections={sections} setSections={setSections} />

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

function NoteCard({ note, onOpen, onEdit, onRefresh, onDelete }) {
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

  return (
    <div
      onClick={onOpen}
      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group cursor-pointer"
    >
      <FileText size={20} className="text-flat-blue-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{note.topic}</span>
          {note.title && <span className="text-xs text-zinc-500 truncate">{note.title}</span>}
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
          <span>{note.sections?.length ?? 0} section{(note.sections?.length ?? 0) !== 1 ? 's' : ''}</span>
          <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">{note.sourceType === 'drive' ? 'Drive' : 'Uploaded'}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" className="px-2 py-1" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Edit note">
          <Pencil size={13} />
        </Button>
        {note.sourceType === 'drive' && (
          <Button variant="ghost" className="px-2 py-1" onClick={handleRefresh} disabled={refreshing} title="Re-download from Drive">
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          </Button>
        )}
        <Button variant={confirming ? 'danger' : 'ghost'} className="px-2 py-1" onClick={handleDelete}>
          <Trash2 size={13} />
          {confirming && <span className="text-xs">Confirm</span>}
        </Button>
      </div>
    </div>
  );
}

export default function PdfNotes() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editNote, setEditNote] = useState(null);

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
    } catch (e) {
      toast.error(e.response?.data?.error ?? 'Refresh failed');
    }
  };

  const handleSaved = (updated) => {
    setNotes((prev) => prev.map((n) => (n._id === updated._id ? updated : n)));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={fetchNotes} />}
      {editNote && <EditModal note={editNote} onClose={() => setEditNote(null)} onSaved={handleSaved} />}

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          PDF Notes <span className="text-zinc-600 text-lg font-normal">({notes.length})</span>
        </h1>
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          <Plus size={14} /> New PDF Note
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-zinc-600">Loading…</div>
      ) : notes.length === 0 ? (
        <div className="text-center py-16 text-zinc-600">
          <BookOpen size={32} className="mx-auto mb-3 text-zinc-400" />
          <p>No PDF notes yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <NoteCard
              key={note._id}
              note={note}
              onOpen={() => navigate(`/pdf-notes/${note._id}`)}
              onEdit={() => setEditNote(note)}
              onRefresh={() => handleRefresh(note._id)}
              onDelete={() => handleDelete(note._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
