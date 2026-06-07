import { useState } from 'react';
import { Shuffle } from 'lucide-react';
import { cardsApi } from '../utils/api.js';
import ReviewSession from '../components/ui/ReviewSession.jsx';
import Button from '../components/ui/Button.jsx';
import toast from 'react-hot-toast';

export default function RandomReview() {
  const [count, setCount] = useState(10);
  const [cards, setCards] = useState(null);
  const [loading, setLoading] = useState(false);

  const start = async () => {
    setLoading(true);
    try {
      const { data } = await cardsApi.getRandom(count);
      setCards(data);
    } catch {
      toast.error('Failed to load cards');
    } finally {
      setLoading(false);
    }
  };

  if (cards !== null) {
    return <ReviewSession cards={cards} title={`Random · ${cards.length} cards`} showRatings onComplete={() => setCards(null)} />;
  }

  return (
    <div className="max-w-md mx-auto mt-24 space-y-6 text-center">
      <Shuffle size={40} className="mx-auto text-emerald-400" />
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Random Review</h1>
      <p className="text-zinc-500 text-sm">Pick a random batch from your entire deck.</p>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-5 text-left">
        <div>
          <label className="block text-xs text-zinc-500 mb-2">Number of cards</label>
          <div className="flex items-center gap-3">
            <input
              type="range" min={1} max={50} value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="flex-1 accent-emerald-500"
            />
            <span className="w-10 text-center text-sm font-mono text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 rounded-lg py-1">{count}</span>
          </div>
        </div>
        <Button variant="primary" className="w-full justify-center py-2.5" onClick={start} disabled={loading}>
          <Shuffle size={14} /> {loading ? 'Loading...' : `Start ${count} cards`}
        </Button>
      </div>
    </div>
  );
}
