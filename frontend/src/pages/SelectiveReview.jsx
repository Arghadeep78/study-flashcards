import { useEffect, useState } from 'react';
import { ListChecks } from 'lucide-react';
import { cardsApi } from '../utils/api.js';
import ReviewSession from '../components/ui/ReviewSession.jsx';
import Button from '../components/ui/Button.jsx';
import toast from 'react-hot-toast';

export default function SelectiveReview() {
  const [topicMap, setTopicMap] = useState([]); // [{topic, subtopics[]}]
  const [selectedTopics, setSelectedTopics] = useState(new Set());
  const [selectedSubtopics, setSelectedSubtopics] = useState(new Set());
  const [count, setCount] = useState(0); // 0 = all
  const [cards, setCards] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cardsApi.getTopics().then(({ data }) => setTopicMap(data)).catch(() => {});
  }, []);

  const toggleTopic = (topic) => {
    const next = new Set(selectedTopics);
    if (next.has(topic)) {
      next.delete(topic);
      // also uncheck its subtopics
      const subs = topicMap.find((t) => t.topic === topic)?.subtopics ?? [];
      setSelectedSubtopics((s) => { const ns = new Set(s); subs.forEach((st) => ns.delete(st)); return ns; });
    } else {
      next.add(topic);
    }
    setSelectedTopics(next);
  };

  const toggleSubtopic = (subtopic) => {
    setSelectedSubtopics((s) => {
      const ns = new Set(s);
      ns.has(subtopic) ? ns.delete(subtopic) : ns.add(subtopic);
      return ns;
    });
  };

  const start = async () => {
    if (selectedTopics.size === 0) return;
    setLoading(true);
    try {
      const { data } = await cardsApi.getSelective({
        topics: [...selectedTopics],
        subtopics: selectedSubtopics.size ? [...selectedSubtopics] : undefined,
        count: count || undefined,
      });
      setCards(data);
    } catch {
      toast.error('Failed to load cards');
    } finally {
      setLoading(false);
    }
  };

  if (cards !== null) {
    return (
      <ReviewSession
        cards={cards}
        title={`Selective · ${cards.length} cards`}
        showRatings
        onComplete={() => setCards(null)}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <ListChecks size={22} className="text-emerald-400" />
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Selective Review</h1>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Select Topics</h2>

        {topicMap.length === 0 && <p className="text-zinc-600 text-sm">No topics yet.</p>}

        <div className="space-y-3">
          {topicMap.map(({ topic, subtopics }) => (
            <div key={topic} className="space-y-2">
              {/* Topic checkbox */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedTopics.has(topic)}
                  onChange={() => toggleTopic(topic)}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-900 dark:text-zinc-100">{topic}</span>
                <span className="text-xs text-zinc-600 ml-auto">{subtopics.length ? `${subtopics.length} subtopics` : ''}</span>
              </label>

              {/* Subtopics — only show when topic selected */}
              {selectedTopics.has(topic) && subtopics.length > 0 && (
                <div className="ml-7 flex flex-wrap gap-2">
                  {subtopics.map((st) => (
                    <label key={st} className="flex items-center gap-1.5 cursor-pointer bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg px-3 py-1 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedSubtopics.has(st)}
                        onChange={() => toggleSubtopic(st)}
                        className="w-3 h-3 accent-emerald-500"
                      />
                      <span className="text-xs text-zinc-700 dark:text-zinc-300">{st}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Number of Cards</h2>
        <div className="flex flex-wrap gap-2">
          {[0, 5, 10, 20, 30, 50, 100].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCount(n)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                count === n
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                  : 'text-zinc-400 border-zinc-300 dark:border-zinc-700 hover:border-zinc-500 hover:text-zinc-800 dark:text-zinc-200'
              }`}
            >
              {n === 0 ? 'All' : n}
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={500}
            placeholder="Custom"
            value={![0, 5, 10, 20, 30, 50, 100].includes(count) ? count : ''}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v > 0) setCount(v);
            }}
            className="w-20 px-3 py-1.5 rounded-lg text-sm font-medium bg-transparent border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
        <p className="text-xs text-zinc-600">Cards are picked randomly from the selected topics. "All" includes every matching card.</p>
      </div>

      <Button
        variant="primary"
        className="w-full justify-center py-2.5"
        onClick={start}
        disabled={loading || selectedTopics.size === 0}
      >
        <ListChecks size={14} />
        {loading ? 'Loading...' : `Start Review${count ? ` · ${count} cards` : ''}`}
      </Button>
    </div>
  );
}
