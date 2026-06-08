import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronLeft, ChevronRight, CheckCircle2, RotateCcw, ZoomIn, ZoomOut, Flag } from 'lucide-react';
import Button from './Button.jsx';
import { pdfNotesApi } from '../../utils/api.js';
import toast from 'react-hot-toast';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const RATING_STYLES = [
  { label: 'Missed', rating: 'fail', cls: 'bg-flat-red-500 hover:bg-flat-red-600 text-white' },
  { label: 'Got it',  rating: 'pass', cls: 'bg-flat-green-500 hover:bg-flat-green-600 text-white' },
];

export default function PdfReviewSession({ sections, onComplete, showRatings = true, title = 'PDF Review' }) {
  const navigate = useNavigate();
  const originalSections = useRef(sections);

  const [queue, setQueue]       = useState(sections);
  const [idx, setIdx]           = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone]         = useState(false);

  // PDF state
  // committedScale → what pdf.js renders at (only updates when gesture ends)
  // visualScale    → live CSS transform during pinch (instant, no re-raster)
  const [committedScale, setCommittedScale] = useState(1.2);
  const visualScaleRef  = useRef(1.2);   // tracked without re-render
  const pagesWrapRef    = useRef(null);  // wraps all Page elements for CSS transform
  const [page, setPage]         = useState(1);
  const [numPages, setNumPages] = useState(0);
  const pdfWrapRef  = useRef(null);
  const pageRefs    = useRef({});
  const prevFileUrl = useRef(null);

  // Derive a stable scale value for the button controls
  const scale = committedScale;

  const section = queue[idx];
  const total   = queue.length;

  // When section changes: reset revealed state and scroll to the section's
  // first page. Only clear numPages when the PDF file itself changes —
  // same-file sections reuse the already-loaded Document.
  useEffect(() => {
    if (!section) return;
    setRevealed(false);
    setPage(section.startPage);

    if (section.noteFileUrl !== prevFileUrl.current) {
      setNumPages(0);
      prevFileUrl.current = section.noteFileUrl;
    } else {
      // Same PDF already rendered — jump straight to the new section's start
      setTimeout(() => {
        pageRefs.current[section.startPage]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }, [idx]);

  // Pinch / Ctrl+scroll zoom — two-phase to avoid re-raster on every tick:
  // 1. During gesture: update CSS transform instantly (no React re-render).
  // 2. On gesture end (200ms debounce): commit to React state → pdf.js re-rasters once.
  useEffect(() => {
    const el = pdfWrapRef.current;
    if (!el) return;

    let commitTimer = null;

    const onWheel = (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();

      const next = Math.min(2.4, Math.max(0.5, visualScaleRef.current - e.deltaY * 0.005));
      visualScaleRef.current = next;

      // Apply CSS transform immediately — no state update, no blank flash
      if (pagesWrapRef.current) {
        pagesWrapRef.current.style.transform = `scale(${next / committedScale})`;
        pagesWrapRef.current.style.transformOrigin = 'top center';
      }

      // Debounce: commit after gesture pauses → pdf.js re-rasters at new scale
      clearTimeout(commitTimer);
      commitTimer = setTimeout(() => {
        if (pagesWrapRef.current) {
          pagesWrapRef.current.style.transform = '';
        }
        setCommittedScale(next);
      }, 200);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => { el.removeEventListener('wheel', onWheel); clearTimeout(commitTimer); };
  }, [committedScale]);

  // Track which page within the current section is most visible
  useEffect(() => {
    if (!numPages || !section) return;
    const { startPage, endPage } = section;
    const visible = {};
    const observers = [];
    for (let p = startPage; p <= Math.min(endPage, numPages); p++) {
      const el = pageRefs.current[p];
      if (!el) continue;
      const obs = new IntersectionObserver(
        ([entry]) => {
          visible[p] = entry.intersectionRatio;
          const best = Object.entries(visible).sort((a, b) => b[1] - a[1])[0];
          if (best) setPage(Number(best[0]));
        },
        { root: pdfWrapRef.current, threshold: Array.from({ length: 11 }, (_, i) => i / 10) }
      );
      obs.observe(el);
      observers.push(obs);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, [numPages, idx, section?.startPage, section?.endPage]);

  const goTo = (p) => {
    if (!section) return;
    const clamped = Math.min(Math.max(section.startPage, p), Math.min(section.endPage, numPages || section.endPage));
    setPage(clamped);
    pageRefs.current[clamped]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const advance = () => {
    setReviewed((r) => r + 1);
    if (idx + 1 >= queue.length) setDone(true);
    else setIdx((i) => i + 1);
  };

  const handleRating = async (rating) => {
    try { await pdfNotesApi.reviewSection(section._id, rating); } catch { /* non-blocking */ }
    advance();
  };

  const handleToggleWeak = async () => {
    try {
      await pdfNotesApi.toggleSectionWeak(section._id);
      setQueue((q) => q.map((s, i) => i === idx ? { ...s, weak: !s.weak } : s));
    } catch {
      toast.error('Failed to toggle weak');
    }
  };

  const restart = () => {
    const fresh = [...originalSections.current];
    setQueue(fresh);
    setIdx(0);
    setReviewed(0);
    setDone(false);
    setRevealed(false);
  };

  // ── Done screen ──
  if (done || queue.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-24 text-center space-y-8 bg-white dark:bg-slate-900 p-12 rounded-3xl shadow-soft">
        {reviewed > 0 ? (
          <>
            <div className="w-24 h-24 bg-flat-green-500 rounded-full flex items-center justify-center mx-auto text-white shadow-soft">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Session Complete!</h2>
            <p className="text-xl text-slate-500 font-bold">
              Reviewed <span className="text-flat-green-500 font-black">{reviewed}</span> section{reviewed !== 1 ? 's' : ''}.
            </p>
          </>
        ) : (
          <>
            <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight">No sections</h2>
            <p className="text-xl text-slate-500 font-bold">Nothing to review here.</p>
          </>
        )}
        <div className="flex gap-4 justify-center pt-8">
          {originalSections.current.length > 0 && (
            <Button variant="secondary" onClick={restart}><RotateCcw size={18} /> Review Again</Button>
          )}
          {onComplete && <Button variant="ghost" onClick={onComplete}>← Back</Button>}
          <Button variant="primary" onClick={() => navigate('/pdf-notes')}>PDF Notes</Button>
        </div>
      </div>
    );
  }

  if (!section) return <div className="text-center mt-24 text-zinc-500 font-bold text-lg">Loading...</div>;

  const sectionPages = section.endPage - section.startPage + 1;
  const pageOffset   = page - section.startPage + 1;

  // ── Main split layout — break out of the layout's padding ──
  return (
    <div className="flex -mx-6 -my-6 overflow-hidden" style={{ height: 'calc(100vh - 2rem)' }}>

      {/* ── Left panel ── */}
      <aside className="w-72 shrink-0 flex flex-col bg-white dark:bg-slate-900 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto">

        {/* Title + progress */}
        <div className="px-5 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">{title}</h1>
            <span className="text-xs font-extrabold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
              {reviewed + 1} / {total}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-flat-blue-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${(reviewed / total) * 100}%` }}
            />
          </div>
        </div>

        {/* Section metadata */}
        <div className="px-5 py-5 border-b border-zinc-100 dark:border-zinc-800 space-y-3">
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 leading-snug">
            {section.subtopic || `Section ${idx + 1}`}
          </h2>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
              {section.noteTopic}
            </span>
            {section.noteTitle && (
              <span className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1 rounded-lg">
                {section.noteTitle}
              </span>
            )}
            <span className="text-xs font-bold text-flat-blue-600 dark:text-flat-blue-400 bg-flat-blue-50 dark:bg-flat-blue-600/10 px-2.5 py-1 rounded-lg">
              {section.startPage === section.endPage ? `p. ${section.startPage}` : `pp. ${section.startPage}–${section.endPage}`}
            </span>
            <span className="text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1 rounded-lg">
              Box {section.boxLevel}
            </span>
          </div>
          {/* Weak toggle */}
          <button
            onClick={handleToggleWeak}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all w-full ${
              section.weak
                ? 'bg-flat-red-50 dark:bg-flat-red-500/10 text-flat-red-500 border border-flat-red-200 dark:border-flat-red-500/30'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-flat-red-300 hover:text-flat-red-500'
            }`}
          >
            <Flag size={14} />
            {section.weak ? 'Marked as weak' : 'Mark as weak'}
          </button>
        </div>

        {/* PDF page navigation */}
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 space-y-3">
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Pages in section</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goTo(page - 1)} disabled={page <= section.startPage}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="flex-1 text-center text-sm font-mono text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 rounded-lg py-1.5">
              {pageOffset} / {sectionPages}
              <span className="text-zinc-400 text-xs ml-1">(p.{page})</span>
            </span>
            <button
              onClick={() => goTo(page + 1)} disabled={page >= Math.min(section.endPage, numPages || section.endPage)}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          {/* Zoom */}
          <div className="flex items-center gap-2">
            <button onClick={() => { visualScaleRef.current = Math.max(0.5, committedScale - 0.15); setCommittedScale(visualScaleRef.current); }} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold">
              <ZoomOut size={13} /> Out
            </button>
            <span className="text-xs text-zinc-400 font-mono w-10 text-center">{Math.round(committedScale * 100)}%</span>
            <button onClick={() => { visualScaleRef.current = Math.min(2.4, committedScale + 0.15); setCommittedScale(visualScaleRef.current); }} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold">
              <ZoomIn size={13} /> In
            </button>
          </div>
          <p className="text-[10px] text-zinc-400">Pinch or Ctrl+scroll to zoom</p>
        </div>

        {/* Spacer pushes rating to bottom */}
        <div className="flex-1" />

        {/* Rating actions pinned to bottom */}
        <div className="px-5 py-5 border-t border-zinc-100 dark:border-zinc-800">
          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="w-full py-3.5 rounded-2xl bg-flat-blue-500 hover:bg-flat-blue-600 text-white text-base font-black tracking-wide transition-all active:scale-95"
            >
              Rate this section
            </button>
          ) : showRatings ? (
            <div className="flex gap-3">
              {RATING_STYLES.map(({ label, rating, cls }) => (
                <button
                  key={rating}
                  onClick={() => handleRating(rating)}
                  className={`flex-1 py-3.5 rounded-2xl text-base font-black tracking-wide transition-all active:scale-95 hover:-translate-y-0.5 ${cls}`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={advance}
              className="w-full py-3.5 rounded-2xl bg-flat-blue-500 hover:bg-flat-blue-600 text-white text-base font-black tracking-wide transition-all active:scale-95"
            >
              Next Section
            </button>
          )}
        </div>
      </aside>

      {/* ── Right: full-height PDF ── */}
      <div className="flex-1 min-w-0 flex flex-col bg-zinc-100 dark:bg-zinc-950 overflow-hidden">
        <div
          ref={pdfWrapRef}
          className="flex-1 overflow-auto flex flex-col items-center p-6 gap-3"
        >
          <Document
            file={section.noteFileUrl}
            onLoadSuccess={({ numPages: n }) => {
              setNumPages(n);
              setTimeout(() => {
                pageRefs.current[section.startPage]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 50);
            }}
            loading={<div className="py-16 text-zinc-500 text-sm">Loading PDF…</div>}
            error={<div className="py-16 text-zinc-500 text-sm">Failed to load PDF.</div>}
          >
            {/* One wrapper div receives the CSS transform during pinch gesture */}
            <div ref={pagesWrapRef} className="flex flex-col items-center gap-3">
              {numPages > 0
                ? Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
                    <div
                      key={p}
                      ref={(el) => { pageRefs.current[p] = el; }}
                      className="shadow-soft"
                      style={{
                        display: p >= section.startPage && p <= section.endPage ? 'block' : 'none',
                      }}
                    >
                      <Page pageNumber={p} scale={committedScale} renderTextLayer renderAnnotationLayer />
                    </div>
                  ))
                : null
              }
            </div>
          </Document>
        </div>
      </div>

    </div>
  );
}
