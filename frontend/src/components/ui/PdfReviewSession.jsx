import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronLeft, ChevronRight, CheckCircle2, RotateCcw, ZoomIn, ZoomOut, Flag, Eye, EyeOff } from 'lucide-react';
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

// PDF pages render ONCE at this scale — zoom is pure CSS transform, no re-renders
const BASE_SCALE = 2.0;


export default function PdfReviewSession({ sections, onComplete, showRatings = true, title = 'PDF Review' }) {
  const navigate = useNavigate();
  const originalSections = useRef(sections);

  const [queue, setQueue]       = useState(sections);
  const [idx, setIdx]           = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [revealed, setRevealed] = useState(false);  // PDF + ratings revealed
  const [metaRevealed, setMetaRevealed] = useState(false); // subtopic/topic/pdf name revealed
  const [done, setDone]         = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  // Block in-app navigation while session is active
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    !done && currentLocation.pathname !== nextLocation.pathname
  );

  // Warn on browser close/refresh while session is active
  useEffect(() => {
    const handler = (e) => {
      if (!done) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [done]);

  // Zoom: pages are rendered once at BASE_SCALE. All zoom is pure CSS transform — no re-renders.
  // displayScale is only used for the % label in the UI.
  const [displayScale, setDisplayScale] = useState(1.0);
  const visualScaleRef = useRef(1.0);   // current logical zoom (no re-render on change)
  const pagesWrapRef   = useRef(null);  // receives CSS transform
  const [page, setPage]         = useState(1);
  const [numPages, setNumPages] = useState(0);
  const pdfWrapRef  = useRef(null);
  const pageRefs    = useRef({});
  const prevFileUrl = useRef(null);

  // Apply zoom via CSS transform only — pdf.js never re-renders.
  // clientX/clientY are in viewport coords (from mouse events); omit for button zoom (uses viewport center).
  const applyZoom = useCallback((next, clientX, clientY) => {
    const scroller = pdfWrapRef.current;
    const wrap     = pagesWrapRef.current;
    if (!scroller || !wrap) return;

    // Dynamic minimum: zoom out until the FULL PAGE fits in the viewport (fit-to-page)
    const fitWidthCSS  = wrap.offsetWidth  > 0 ? scroller.clientWidth  / wrap.offsetWidth  : 0.15;
    const fitHeightCSS = wrap.offsetHeight > 0 ? scroller.clientHeight / wrap.offsetHeight : 0.15;
    const fitPageCSS   = Math.min(fitWidthCSS, fitHeightCSS); // smaller = full page fits
    const minCSS       = Math.max(fitPageCSS, 0.1);           // hard floor
    const minScale     = minCSS * BASE_SCALE;

    const clamped = Math.min(3.0, Math.max(minScale, next));
    const oldCSS  = visualScaleRef.current / BASE_SCALE;
    const newCSS  = clamped / BASE_SCALE;
    const ratio   = newCSS / oldCSS;

    // Transform-origin of pagesWrap (top center) in scroll-coordinate space
    const ox = wrap.offsetLeft + wrap.offsetWidth / 2;
    const oy = wrap.offsetTop;

    // Mouse in scroller viewport coords; fall back to viewport center for button zoom
    const rect = scroller.getBoundingClientRect();
    const mx = clientX !== undefined ? clientX - rect.left : scroller.clientWidth  / 2;
    const my = clientY !== undefined ? clientY - rect.top  : scroller.clientHeight / 2;

    // Apply CSS scale
    wrap.style.transform       = `scale(${newCSS})`;
    wrap.style.transformOrigin = 'top center';

    // Collapse excess scroll space caused by transform not affecting layout size:
    //   layout height = wrap.offsetHeight (unchanged by transform)
    //   visual height = wrap.offsetHeight * newCSS
    //   excess        = layout - visual
    const excessH = wrap.offsetHeight * (1 - newCSS);
    wrap.style.marginBottom = excessH > 0 ? `-${excessH}px` : '0px';

    // Adjust scroll so the content point under the cursor stays fixed
    scroller.scrollLeft = ox * (1 - ratio) + (mx + scroller.scrollLeft) * ratio - mx;
    scroller.scrollTop  = oy * (1 - ratio) + (my + scroller.scrollTop)  * ratio - my;

    visualScaleRef.current = clamped;
    setDisplayScale(clamped);
  }, []);

  // On first load, fit the page to the viewer width (100% fit-by-width).
  // On subsequent section changes within the same PDF, preserve current zoom.
  const initialZoomDone = useRef(false);
  useEffect(() => {
    if (numPages <= 0) return;
    const id = requestAnimationFrame(() => {
      const scroller = pdfWrapRef.current;
      const wrap     = pagesWrapRef.current;
      if (scroller && wrap && !initialZoomDone.current) {
        // fit-to-width: CSS scale so the page exactly fills the scroller width
        const fitWidthCSS = wrap.offsetWidth > 0 ? scroller.clientWidth / wrap.offsetWidth : 1;
        applyZoom(fitWidthCSS * BASE_SCALE);
        initialZoomDone.current = true;
      } else {
        applyZoom(visualScaleRef.current);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [numPages, applyZoom]);

  const section = queue[idx];
  const total   = queue.length;

  // When section changes: reset revealed state and scroll to the section's
  // first page. Only clear numPages when the PDF file itself changes —
  // same-file sections reuse the already-loaded Document.
  useEffect(() => {
    if (!section) return;
    setRevealed(false);
    setMetaRevealed(false);
    setPage(section.startPage);

    if (section.noteFileUrl !== prevFileUrl.current) {
      setNumPages(0);
      initialZoomDone.current = false; // new PDF — re-run fit-to-width
      prevFileUrl.current = section.noteFileUrl;
    } else {
      // Same PDF already rendered — jump straight to the new section's start
      setTimeout(() => {
        pageRefs.current[section.startPage]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }, [idx]);

  // Ctrl+scroll zoom — pure CSS, no debounce, no re-render, zooms to cursor
  useEffect(() => {
    const el = pdfWrapRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      applyZoom(visualScaleRef.current - e.deltaY * 0.005, e.clientX, e.clientY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [applyZoom]);

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

  // ── Quit confirm modal (manual quit button OR blocker intercept) ──
  const quitConfirmEl = (showQuitConfirm || blocker.state === 'blocked') && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-xl text-center space-y-4">
        <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100">Quit session?</h2>
        <p className="text-sm text-zinc-500">
          Progress so far (<span className="font-bold text-zinc-700 dark:text-zinc-300">{reviewed}</span> reviewed) is already saved. Remaining sections won't be rated.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={() => { blocker.reset?.(); setShowQuitConfirm(false); }}
            className="px-5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Keep going
          </button>
          <button
            onClick={() => { setShowQuitConfirm(false); if (blocker.state === 'blocked') { blocker.proceed(); } else if (onComplete) { onComplete(); } else { navigate('/pdf-notes'); } }}
            className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors"
          >
            Quit
          </button>
        </div>
      </div>
    </div>
  );

  // ── Done screen ──
  if (done || queue.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-24 text-center space-y-8 bg-white dark:bg-slate-900 p-12 rounded-3xl shadow-soft">
        {quitConfirmEl}
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
    <div className="flex -mx-6 -my-6" style={{ height: 'calc(100vh - 2rem)', overflow: 'hidden' }}>
      {quitConfirmEl}

      {/* ── Left panel ── */}
      <aside className="w-60 shrink-0 flex flex-col bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800">

        {/* Header: session title + progress + quit */}
        <div className="px-4 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest truncate">{title}</span>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-[10px] font-bold text-zinc-400 tabular-nums">{reviewed + 1} / {total}</span>
              <button
                onClick={() => setShowQuitConfirm(true)}
                className="text-[10px] font-bold text-zinc-400 hover:text-red-500 transition-colors uppercase tracking-wide"
                title="Quit session"
              >
                Quit
              </button>
            </div>
          </div>
          <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-flat-blue-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(reviewed / total) * 100}%` }}
            />
          </div>
        </div>

        {/* Section info */}
        <div className="px-4 py-4 border-b border-zinc-100 dark:border-zinc-800 space-y-3">

          {/* Title always visible + eye toggle for subtopic/topic/pdf */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 leading-tight break-words flex-1">
                {section.noteTitle && section.noteTitle !== section.subtopic
                  ? section.noteTitle
                  : section.subtopic || `Section ${idx + 1}`}
              </h2>
              <button
                onClick={() => setMetaRevealed((v) => !v)}
                title={metaRevealed ? 'Hide details' : 'Reveal details'}
                className="shrink-0 mt-1 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                {metaRevealed ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Details — blacked out until clicked */}
            <div className="mt-3 space-y-2.5">
              {/* Subtopic (when title differs) */}
              {section.noteTitle && section.noteTitle !== section.subtopic && section.subtopic && (
                <div>
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-0.5">Subtopic</p>
                  <p
                    onClick={() => setMetaRevealed(true)}
                    className={`text-base font-medium leading-snug rounded break-words transition-all select-none ${metaRevealed ? 'text-zinc-500 dark:text-zinc-400' : 'bg-zinc-900 dark:bg-zinc-100 text-transparent cursor-pointer'}`}
                  >
                    {section.subtopic}
                  </p>
                </div>
              )}
              {/* Topic breadcrumb */}
              <div>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-0.5">Topic</p>
                <p
                  onClick={() => setMetaRevealed(true)}
                  className={`text-base font-semibold leading-snug rounded break-words transition-all select-none ${metaRevealed ? 'text-zinc-700 dark:text-zinc-300' : 'bg-zinc-900 dark:bg-zinc-100 text-transparent cursor-pointer'}`}
                >
                  {section.noteTopic}{section.subtopic ? ` › ${section.subtopic}` : ''}
                </p>
              </div>
              {/* PDF name */}
              {section.notePdfName && (
                <div
                  onClick={() => setMetaRevealed(true)}
                  className={`flex items-center gap-1.5 text-sm rounded transition-all select-none ${metaRevealed ? 'text-zinc-500 dark:text-zinc-400' : 'bg-zinc-900 dark:bg-zinc-100 text-transparent cursor-pointer'}`}
                >
                  <span className="shrink-0">📄</span>
                  <span className="truncate font-medium">{section.notePdfName}</span>
                </div>
              )}
              {/* Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  onClick={() => setMetaRevealed(true)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all select-none cursor-pointer ${metaRevealed ? 'bg-flat-blue-50 dark:bg-flat-blue-500/10 text-flat-blue-600 dark:text-flat-blue-400' : 'bg-zinc-900 dark:bg-zinc-100 text-transparent'}`}
                >
                  {section.startPage === section.endPage ? `p. ${section.startPage}` : `pp. ${section.startPage}–${section.endPage}`}
                </span>
                <span
                  onClick={() => setMetaRevealed(true)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all select-none cursor-pointer ${metaRevealed
                    ? section.boxLevel === 0 ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500' :
                      section.boxLevel === 1 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' :
                      section.boxLevel === 2 ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' :
                      'bg-flat-blue-50 dark:bg-flat-blue-900/20 text-flat-blue-600 dark:text-flat-blue-400'
                    : 'bg-zinc-900 dark:bg-zinc-100 text-transparent'}`}
                >
                  Box {section.boxLevel}
                </span>
                {section.difficulty && (
                  <span
                    onClick={() => setMetaRevealed(true)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all select-none cursor-pointer ${metaRevealed
                      ? section.difficulty === 'Easy' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' :
                        section.difficulty === 'Medium' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' :
                        'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400'
                      : 'bg-zinc-900 dark:bg-zinc-100 text-transparent'}`}
                  >
                    {section.difficulty}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Weak toggle — always visible */}
          <button
            onClick={handleToggleWeak}
            className={`flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              section.weak
                ? 'bg-red-50 dark:bg-red-500/10 text-red-500 border border-red-200 dark:border-red-500/30'
                : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:border-red-300 dark:hover:border-red-500/40 hover:text-red-500'
            }`}
          >
            <Flag size={12} />
            {section.weak ? 'Marked as weak' : 'Mark as weak'}
          </button>
        </div>

        {/* Page nav + zoom — only after PDF is revealed */}
        <div className={`px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 space-y-2 ${!revealed ? 'opacity-0 pointer-events-none' : ''}`}>
          {/* Page navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => goTo(page - 1)}
              disabled={page <= section.startPage}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-600 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="flex-1 text-center">
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200 tabular-nums">{pageOffset}</span>
              <span className="text-xs text-zinc-400 font-medium"> / {sectionPages}</span>
              <span className="text-[10px] text-zinc-400 ml-1.5">p.{page}</span>
            </div>
            <button
              onClick={() => goTo(page + 1)}
              disabled={page >= Math.min(section.endPage, numPages || section.endPage)}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-600 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => applyZoom(visualScaleRef.current - 0.15)}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-100 transition-colors text-[10px] font-semibold"
            >
              <ZoomOut size={11} /> Out
            </button>
            <span className="text-[11px] text-zinc-400 font-mono w-10 text-center tabular-nums">
              {Math.round(displayScale * 100)}%
            </span>
            <button
              onClick={() => applyZoom(visualScaleRef.current + 0.15)}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-100 transition-colors text-[10px] font-semibold"
            >
              <ZoomIn size={11} /> In
            </button>
          </div>
        </div>

        <div className="flex-1" />

        {/* CTA — pinned to bottom */}
        <div className="px-4 py-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
          {!revealed ? (
            <div className="text-center text-xs text-zinc-400 py-2">Click the PDF to reveal</div>
          ) : showRatings ? (
            <div className="flex flex-col gap-2">
              {RATING_STYLES.map(({ label, rating, cls }) => (
                <button
                  key={rating}
                  onClick={() => handleRating(rating)}
                  className={`w-full py-2.5 rounded-xl text-sm font-black tracking-wide transition-all active:scale-95 shadow-sm ${cls}`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={advance}
              className="w-full py-3 rounded-xl bg-flat-blue-500 hover:bg-flat-blue-600 text-white text-sm font-black tracking-wide transition-all active:scale-95 shadow-sm"
            >
              Next →
            </button>
          )}
        </div>
      </aside>

      {/* ── Right: full-height PDF ── */}
      <div
        className="flex-1 min-w-0"
        style={{ position: 'relative', overflow: 'hidden' }}
      >
        {/* Blur overlay before reveal */}
        {!revealed && (
          <div
            style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(18px)', background: 'rgba(255,255,255,0.4)' }}
            className="dark:bg-zinc-900/50"
          >
            <button
              onClick={() => setRevealed(true)}
              className="px-8 py-3 rounded-2xl bg-flat-blue-500 hover:bg-flat-blue-600 text-white text-base font-black tracking-wide shadow-lg transition-all active:scale-95"
            >
              Reveal PDF
            </button>
          </div>
        )}

        {/* Grey canvas — inset on all sides so it ends before each boundary */}
        <div
          style={{
            position: 'absolute',
            inset: '10px',
            borderRadius: '10px',
            overflow: 'hidden',
            border: '1.5px solid var(--pdf-canvas-border)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
          }}
        >
          <div
            ref={pdfWrapRef}
            className="p-6"
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'var(--pdf-canvas-bg)',
            }}
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
              {/* One wrapper div receives the CSS transform */}
              <div ref={pagesWrapRef} className="flex flex-col items-center gap-3">
                {numPages > 0
                  ? Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
                      <div
                        key={p}
                        ref={(el) => { pageRefs.current[p] = el; }}
                        style={{
                          display: p >= section.startPage && p <= section.endPage ? 'block' : 'none',
                          background: '#fff',
                          borderRadius: '4px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.08)',
                          overflow: 'hidden',
                        }}
                      >
                        <Page pageNumber={p} scale={BASE_SCALE} renderTextLayer renderAnnotationLayer />
                      </div>
                    ))
                  : null
                }
              </div>
            </Document>
          </div>
        </div>
      </div>


    </div>
  );
}
