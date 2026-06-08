import { useEffect, useState } from 'react';
import { Flag, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { pdfNotesApi } from '../utils/api.js';
import { TopicBadge } from '../components/ui/Badge.jsx';
import PdfReviewSession from '../components/ui/PdfReviewSession.jsx';
import Button from '../components/ui/Button.jsx';
import toast from 'react-hot-toast';

export default function PdfWeakReview() {
  const navigate = useNavigate();
  const [sections, setSections] = useState(null);
  const [reviewing, setReviewing] = useState(false);

  const load = () =>
    pdfNotesApi.getWeakSections()
      .then(({ data }) => setSections(data))
      .catch(() => {
        toast.error('Failed to load weak sections');
        setSections([]);
      });

  useEffect(() => {
    load();
  }, []);

  const handleUnmark = async (sectionId) => {
    try {
      await pdfNotesApi.toggleSectionWeak(sectionId);
      setSections((prev) => prev.filter((s) => s._id !== sectionId));
      toast.success('Removed from weak sections');
    } catch {
      toast.error('Failed to unmark section');
    }
  };

  if (reviewing && sections?.length) {
    return (
      <PdfReviewSession
        sections={sections}
        title={`PDF Weak Sections · ${sections.length}`}
        showRatings
        onComplete={() => {
          setReviewing(false);
          load();
        }}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Flag size={20} className="text-flat-red-500" />
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Weak PDF Sections
            <span className="text-zinc-600 text-lg font-normal ml-2">({sections?.length ?? '…'})</span>
          </h1>
        </div>
        {sections?.length > 0 && (
          <Button variant="primary" onClick={() => setReviewing(true)}>
            <Flag size={14} /> Review All Weak
          </Button>
        )}
      </div>

      {sections === null && <div className="text-center py-16 text-zinc-600">Loading...</div>}

      {sections?.length === 0 && (
        <div className="text-center py-16 text-zinc-600">
          <Flag size={36} className="mx-auto mb-3 opacity-30 text-flat-red-500" />
          <p>No weak PDF sections marked yet.</p>
          <p className="text-xs mt-1">Flag sections with the <Flag size={11} className="inline" /> icon during any review session.</p>
        </div>
      )}

      <div className="space-y-2">
        {sections?.map((sec) => (
          <div key={sec._id} className="bg-white dark:bg-zinc-900 border border-red-500/10 rounded-xl px-4 py-3 flex items-center gap-3 group hover:border-red-500/20 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {sec.subtopic || 'Unnamed section'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <TopicBadge topic={sec.noteTopic} />
                {sec.noteTitle && (
                  <span className="text-xs text-zinc-400 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1 rounded shadow-sm font-bold uppercase tracking-wider">
                    {sec.noteTitle}
                  </span>
                )}
                <span className="text-xs font-bold text-flat-blue-600 dark:text-flat-blue-400 bg-flat-blue-50 dark:bg-flat-blue-600/10 px-2.5 py-1 rounded shadow-sm uppercase tracking-wider">
                  {sec.startPage === sec.endPage ? `p. ${sec.startPage}` : `pp. ${sec.startPage}–${sec.endPage}`}
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded shadow-sm bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 font-bold uppercase tracking-wider">
                  Box {sec.boxLevel}
                </span>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                className="px-2 py-1"
                onClick={() => navigate(`/pdf-notes/${sec.noteId}?page=${sec.startPage}`)}
              >
                <Eye size={13} />
              </Button>
              <Button
                variant="ghost"
                className="px-2 py-1 text-flat-red-500 hover:text-flat-red-600"
                onClick={() => handleUnmark(sec._id)}
              >
                <Flag size={13} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
