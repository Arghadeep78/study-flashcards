import { useEffect, useState } from 'react';
import { ListChecks } from 'lucide-react';
import { pdfNotesApi } from '../utils/api.js';
import PdfReviewSession from '../components/ui/PdfReviewSession.jsx';
import Button from '../components/ui/Button.jsx';
import toast from 'react-hot-toast';

export default function PdfSelectiveReview() {
  const [notes, setNotes] = useState([]);
  const [selectedNoteIds, setSelectedNoteIds] = useState(new Set());
  const [count, setCount] = useState(0);
  const [sections, setSections] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    pdfNotesApi.getAll().then(({ data }) => setNotes(data)).catch(() => {});
  }, []);

  const toggleNote = (id) => {
    setSelectedNoteIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const start = async () => {
    if (selectedNoteIds.size === 0) return;
    setLoading(true);
    try {
      const { data } = await pdfNotesApi.getSelectiveSections({
        noteIds: [...selectedNoteIds],
        count: count || undefined,
      });
      setSections(data);
    } catch {
      toast.error('Failed to load sections');
    } finally {
      setLoading(false);
    }
  };

  if (sections !== null) {
    return (
      <PdfReviewSession
        sections={sections}
        title={`PDF Selective · ${sections.length} sections`}
        showRatings
        onComplete={() => setSections(null)}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <ListChecks size={22} className="text-flat-green-500" />
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">PDF Selective Review</h1>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Select PDF Notes</h2>

        {notes.length === 0 && <p className="text-zinc-600 text-sm">No PDF notes yet.</p>}

        <div className="space-y-2">
          {notes.map((note) => (
            <label key={note._id} className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
              <input
                type="checkbox"
                checked={selectedNoteIds.has(note._id)}
                onChange={() => toggleNote(note._id)}
                className="w-4 h-4 accent-flat-green-500 rounded"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{note.topic}</span>
                {note.title && <span className="text-xs text-zinc-400 ml-2">{note.title}</span>}
              </div>
              <span className="text-xs text-zinc-400 shrink-0">{note.sections?.length ?? 0} sections</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Number of Sections</h2>
        <div className="flex flex-wrap gap-2">
          {[0, 5, 10, 20, 30, 50].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCount(n)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                count === n
                  ? 'bg-flat-green-500/15 text-flat-green-600 border-flat-green-500/40'
                  : 'text-zinc-400 border-zinc-300 dark:border-zinc-700 hover:border-zinc-500 hover:text-zinc-800 dark:text-zinc-200'
              }`}
            >
              {n === 0 ? 'All' : n}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500">"All" includes every section from the selected notes.</p>
      </div>

      <Button
        variant="primary"
        className="w-full justify-center py-2.5"
        onClick={start}
        disabled={loading || selectedNoteIds.size === 0}
      >
        <ListChecks size={14} />
        {loading ? 'Loading...' : `Start Review${count ? ` · ${count} sections` : ''}`}
      </Button>
    </div>
  );
}
