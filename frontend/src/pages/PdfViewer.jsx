import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronLeft, ChevronRight, ArrowLeft, ZoomIn, ZoomOut, RefreshCw, Pencil, Plus, Trash2, X } from 'lucide-react';
import { pdfNotesApi } from '../utils/api.js';
import Button from '../components/ui/Button.jsx';
import toast from 'react-hot-toast';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

function sectionForPage(sections, page) {
  return sections.find((s) => page >= s.startPage && page <= s.endPage) ?? null;
}

// ---- inline EditModal (same pattern as PdfNotes.jsx) ----

function emptySection() { return { startPage: '', endPage: '', subtopic: '' }; }

function normalizeSections(rows) {
  return rows
    .map((r) => {
      const start = parseInt(r.startPage, 10);
      const end = r.endPage === '' || r.endPage == null ? start : parseInt(r.endPage, 10);
      return { startPage: start, endPage: end, subtopic: (r.subtopic ?? '').trim() };
    })
    .filter((r) => Number.isInteger(r.startPage) && r.startPage >= 1);
}


function validateSections(sections) {
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (!Number.isInteger(s.endPage) || s.endPage < s.startPage)
      return `Section ${i + 1}: end page must be ≥ start page`;
  }
  return null;
}

const inputCls =
  'w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-flat-blue-500';

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

  const updateSection = (i, key, value) =>
    setSections((prev) => prev.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)));
  const addSection = () => setSections((prev) => [...prev, emptySection()]);
  const removeSection = (i) => setSections((prev) => prev.filter((_, idx) => idx !== i));

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
      <div style={{ borderRadius: 16, width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', maxHeight: '90vh', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }} className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700">

        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Edit PDF Note</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"><X size={16} /></button>
        </div>

        <div style={{ overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
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

          {/* Sections editor */}
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
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Start</label>
                      <input
                        type="number" min="1" value={s.startPage}
                        onChange={(e) => updateSection(i, 'startPage', e.target.value)}
                        placeholder="1"
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-flat-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">End</label>
                      <input
                        type="number" min="1" value={s.endPage}
                        onChange={(e) => updateSection(i, 'endPage', e.target.value)}
                        placeholder={s.startPage || '1'}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-flat-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <button type="button" onClick={() => removeSection(i)} className="self-end mb-0.5 p-1.5 text-zinc-400 hover:text-red-500 transition-colors shrink-0"><Trash2 size={14} /></button>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Subtopic</label>
                    <input value={s.subtopic} onChange={(e) => updateSection(i, 'subtopic', e.target.value)} placeholder="e.g. Memoization, Graph BFS…" className={inputCls} />
                  </div>
                </div>
              ))}
              {sections.length === 0 && (
                <p className="text-xs text-zinc-400 italic">No sections yet. Click "Add section" to create one.</p>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-2">Same number for Start and End = single page.</p>
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

// ---- PdfViewer ----

export default function PdfViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [committedScale, setCommittedScale] = useState(1.2);
  const visualScaleRef = useRef(1.2);
  const pagesWrapRef   = useRef(null);
  const [continuous, setContinuous] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const pageWrapRef = useRef(null);
  const pageRefs = useRef({});

  useEffect(() => {
    pdfNotesApi.getOne(id)
      .then(({ data }) => setNote(data))
      .catch((e) => toast.error(e.response?.data?.error ?? 'Failed to load note'));
  }, [id]);

  // Pinch / Ctrl+scroll: CSS transform during gesture, commit on debounce end
  useEffect(() => {
    const el = pageWrapRef.current;
    if (!el) return;
    let commitTimer = null;
    const onWheel = (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const next = Math.min(2.4, Math.max(0.5, visualScaleRef.current - e.deltaY * 0.005));
      visualScaleRef.current = next;
      if (pagesWrapRef.current) {
        pagesWrapRef.current.style.transform = `scale(${next / committedScale})`;
        pagesWrapRef.current.style.transformOrigin = 'top center';
      }
      clearTimeout(commitTimer);
      commitTimer = setTimeout(() => {
        if (pagesWrapRef.current) pagesWrapRef.current.style.transform = '';
        setCommittedScale(next);
      }, 200);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => { el.removeEventListener('wheel', onWheel); clearTimeout(commitTimer); };
  }, [committedScale, note]);

  // In continuous mode: detect which page is most visible via IntersectionObserver
  useEffect(() => {
    if (!continuous || !numPages) return;
    const observers = [];
    const visible = {};
    for (let p = 1; p <= numPages; p++) {
      const el = pageRefs.current[p];
      if (!el) continue;
      const obs = new IntersectionObserver(
        ([entry]) => {
          visible[p] = entry.intersectionRatio;
          const best = Object.entries(visible).sort((a, b) => b[1] - a[1])[0];
          if (best) setPage(Number(best[0]));
        },
        { root: pageWrapRef.current, threshold: Array.from({ length: 11 }, (_, i) => i / 10) }
      );
      obs.observe(el);
      observers.push(obs);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, [continuous, numPages]);

  const sections = note?.sections ?? [];
  const fileUrl = note?.fileUrl ?? null;

  const goTo = (p) => {
    const clamped = Math.min(Math.max(1, p), numPages || 1);
    setPage(clamped);
    if (continuous) {
      pageRefs.current[clamped]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      pageWrapRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const currentSection = useMemo(() => sectionForPage(sections, page), [sections, page]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { data } = await pdfNotesApi.refresh(id);
      setNote(data);
      setLoadError('');
      toast.success('Re-downloaded from Drive');
    } catch (e) {
      toast.error(e.response?.data?.error ?? 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  if (!note) return <div className="text-center py-16 text-zinc-600">Loading…</div>;

  return (
    <div className="flex -mx-6 -my-6 overflow-hidden" style={{ height: 'calc(100vh - 2rem)' }}>
      {showEdit && (
        <EditModal
          note={note}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => setNote(updated)}
        />
      )}

      {/* ── Left panel: metadata + nav + sections ── */}
      <aside className="w-64 shrink-0 flex flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto">
        {/* Back + title */}
        <div className="px-4 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800 space-y-3">
          <button
            onClick={() => navigate('/pdf-notes')}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors font-semibold"
          >
            <ArrowLeft size={13} /> All PDF Notes
          </button>
          <div>
            <h1 className="text-base font-black text-zinc-900 dark:text-zinc-100 leading-snug">{note.topic}</h1>
            {note.title && <p className="text-xs text-zinc-500 mt-0.5">{note.title}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-flat-blue-500 hover:text-flat-blue-600 transition-colors"
            >
              <Pencil size={12} /> Edit note
            </button>
            {note.sourceType === 'drive' && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              >
                <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Sync
              </button>
            )}
          </div>
        </div>

        {/* Page navigation */}
        <div className="px-4 py-4 border-b border-zinc-100 dark:border-zinc-800 space-y-3">
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Navigation</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goTo(page - 1)} disabled={page <= 1}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="flex-1 text-center text-sm font-mono text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 rounded-lg py-1.5">
              {page} / {numPages || '…'}
            </span>
            <button
              onClick={() => goTo(page + 1)} disabled={numPages > 0 && page >= numPages}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          {currentSection && (
            <div className="text-xs px-3 py-2 rounded-lg bg-flat-blue-50 dark:bg-flat-blue-600/10 text-flat-blue-600 dark:text-flat-blue-400 font-semibold">
              {currentSection.subtopic || 'Unnamed section'}
              <span className="text-flat-blue-400 font-normal ml-1">
                · {currentSection.startPage === currentSection.endPage ? `p.${currentSection.startPage}` : `pp.${currentSection.startPage}–${currentSection.endPage}`}
              </span>
            </div>
          )}
          {/* Zoom */}
          <div className="flex items-center gap-2">
            <button onClick={() => { const n = Math.max(0.5, committedScale - 0.2); visualScaleRef.current = n; setCommittedScale(n); }} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold">
              <ZoomOut size={13} /> Out
            </button>
            <span className="text-xs text-zinc-400 font-mono w-10 text-center">{Math.round(committedScale * 100)}%</span>
            <button onClick={() => { const n = Math.min(2.4, committedScale + 0.2); visualScaleRef.current = n; setCommittedScale(n); }} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold">
              <ZoomIn size={13} /> In
            </button>
          </div>
          {/* Scroll mode toggle */}
          <button
            onClick={() => setContinuous((v) => !v)}
            className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${continuous ? 'border-flat-blue-400 bg-flat-blue-50 dark:bg-flat-blue-600/10 text-flat-blue-600 dark:text-flat-blue-400' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
          >
            {continuous ? 'Continuous scroll' : 'Single page'}
          </button>
          <p className="text-[10px] text-zinc-400">Pinch or Ctrl+scroll to zoom</p>
        </div>

        {/* Sections list */}
        <div className="px-4 py-4 flex-1">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Sections</p>
            <button
              onClick={() => setShowEdit(true)}
              className="text-xs text-flat-blue-500 hover:text-flat-blue-600 font-semibold flex items-center gap-1"
            >
              <Pencil size={11} /> Edit
            </button>
          </div>
          {sections.length === 0 ? (
            <div>
              <p className="text-xs text-zinc-400">No sections yet.</p>
              <button onClick={() => setShowEdit(true)} className="mt-2 text-xs text-flat-blue-500 hover:text-flat-blue-600 font-semibold flex items-center gap-1">
                <Plus size={11} /> Add sections
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {sections.map((s, i) => {
                const active = currentSection === s;
                return (
                  <button
                    key={i}
                    onClick={() => goTo(s.startPage)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${active ? 'bg-flat-blue-50 dark:bg-flat-blue-600/10 text-flat-blue-600 dark:text-flat-blue-400' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                  >
                    <span className={`block text-sm truncate ${active ? 'font-bold' : 'font-medium'}`}>
                      {s.subtopic || `Section ${i + 1}`}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {s.startPage === s.endPage ? `p. ${s.startPage}` : `pp. ${s.startPage}–${s.endPage}`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* ── Right: full-height PDF viewer ── */}
      <div className="flex-1 min-w-0 flex flex-col bg-zinc-100 dark:bg-zinc-950 overflow-hidden">
        <div
          ref={pageWrapRef}
          className="flex-1 overflow-auto flex flex-col items-center p-6 gap-3"
        >
          {loadError ? (
            <div className="text-center py-16 text-zinc-500 self-center">
              <p className="mb-3">{loadError}</p>
              {note.sourceType === 'drive' && (
                <Button variant="secondary" onClick={handleRefresh} disabled={refreshing}>
                  <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Re-download from Drive
                </Button>
              )}
            </div>
          ) : (
            <Document
              file={fileUrl}
              onLoadSuccess={({ numPages }) => { setNumPages(numPages); setLoadError(''); }}
              onLoadError={(e) => setLoadError(e?.message || 'Failed to render PDF')}
              loading={<div className="py-16 text-zinc-500">Loading PDF…</div>}
            >
              <div ref={pagesWrapRef} className="flex flex-col items-center gap-3">
                {continuous
                  ? Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
                      <div key={p} ref={(el) => { pageRefs.current[p] = el; }} className="shadow-soft">
                        <Page pageNumber={p} scale={committedScale} renderTextLayer renderAnnotationLayer />
                      </div>
                    ))
                  : <Page pageNumber={page} scale={committedScale} renderTextLayer renderAnnotationLayer className="shadow-soft" />
                }
              </div>
            </Document>
          )}
        </div>

        {/* Bottom page nav bar — only shown in single-page mode */}
        {!continuous && (
          <div className="shrink-0 flex items-center justify-center gap-4 px-6 py-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
            <Button onClick={() => goTo(page - 1)} disabled={page <= 1}><ChevronLeft size={14} /> Prev</Button>
            <span className="text-sm font-mono text-zinc-500">{page} / {numPages || '…'}</span>
            <Button variant="primary" onClick={() => goTo(page + 1)} disabled={numPages > 0 && page >= numPages}>Next <ChevronRight size={14} /></Button>
          </div>
        )}
      </div>
    </div>
  );
}
