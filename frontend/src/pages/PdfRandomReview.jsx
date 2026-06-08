import { useState } from 'react';
import { Shuffle } from 'lucide-react';
import { pdfNotesApi } from '../utils/api.js';
import PdfReviewSession from '../components/ui/PdfReviewSession.jsx';
import Button from '../components/ui/Button.jsx';
import toast from 'react-hot-toast';

export default function PdfRandomReview() {
  const [count, setCount] = useState(10);
  const [sections, setSections] = useState(null);
  const [loading, setLoading] = useState(false);

  const start = async () => {
    setLoading(true);
    try {
      const { data } = await pdfNotesApi.getRandomSections(count);
      setSections(data);
    } catch {
      toast.error('Failed to load sections');
    } finally {
      setLoading(false);
    }
  };

  if (sections !== null) {
    return <PdfReviewSession sections={sections} title={`PDF Random · ${sections.length} sections`} showRatings onComplete={() => setSections(null)} />;
  }

  return (
    <div className="max-w-md mx-auto mt-24 space-y-6 text-center">
      <Shuffle size={40} className="mx-auto text-flat-green-500" />
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">PDF Random Review</h1>
      <p className="text-zinc-500 text-sm">Pick a random batch of sections from your PDF notes.</p>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-5 text-left">
        <div>
          <label className="block text-xs text-zinc-500 mb-2">Number of sections</label>
          <div className="flex items-center gap-3">
            <input
              type="range" min={1} max={50} value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="flex-1 accent-flat-green-500"
            />
            <span className="w-10 text-center text-sm font-mono text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 rounded-lg py-1">{count}</span>
          </div>
        </div>
        <Button variant="primary" className="w-full justify-center py-2.5" onClick={start} disabled={loading}>
          <Shuffle size={14} /> {loading ? 'Loading...' : `Start ${count} sections`}
        </Button>
      </div>
    </div>
  );
}
