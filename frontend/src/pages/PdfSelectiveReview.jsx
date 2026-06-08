import { useEffect, useState } from 'react';
import { ListChecks } from 'lucide-react';
import { pdfNotesApi } from '../utils/api.js';
import PdfReviewSession from '../components/ui/PdfReviewSession.jsx';
import Button from '../components/ui/Button.jsx';
import toast from 'react-hot-toast';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const BOXES = [0, 1, 2, 3];

export default function PdfSelectiveReview() {
  const [topicMap, setTopicMap] = useState([]); // [{topic, subtopics[], sectionCount}]
  const [selectedTopics, setSelectedTopics] = useState(new Set());
  const [selectedSubtopics, setSelectedSubtopics] = useState(new Set());
  const [filterDifficulty, setFilterDifficulty] = useState([]);
  const [filterBox, setFilterBox] = useState([]);
  const [count, setCount] = useState(0);
  const [sections, setSections] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    pdfNotesApi.getAll().then(({ data }) => {
      const map = {};
      const counts = {};
      for (const note of data) {
        if (note.archived) continue;
        const t = note.topic;
        if (!map[t]) { map[t] = new Set(); counts[t] = 0; }
        counts[t] += 1;
        const sub = note.subtopic?.trim() || 'General';
        map[t].add(sub);
      }
      const sorted = Object.entries(map).map(([topic, subSet]) => ({
        topic,
        subtopics: Array.from(subSet).sort(),
        sectionCount: counts[topic],
      })).sort((a, b) => a.topic.localeCompare(b.topic));
      setTopicMap(sorted);
    }).catch(() => {});
  }, []);

  const toggleTopic = (topic) => {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) {
        next.delete(topic);
        const subs = topicMap.find((t) => t.topic === topic)?.subtopics ?? [];
        setSelectedSubtopics((prevSub) => {
          const nextSub = new Set(prevSub);
          subs.forEach((st) => nextSub.delete(st));
          return nextSub;
        });
      } else {
        next.add(topic);
      }
      return next;
    });
  };

  const toggleSubtopic = (subtopic) => {
    setSelectedSubtopics((s) => {
      const ns = new Set(s);
      ns.has(subtopic) ? ns.delete(subtopic) : ns.add(subtopic);
      return ns;
    });
  };

  const toggleDifficulty = (d) => setFilterDifficulty(prev =>
    prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
  );

  const toggleBox = (b) => setFilterBox(prev =>
    prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]
  );

  const start = async () => {
    if (selectedTopics.size === 0) return;
    setLoading(true);
    try {
      const mappedSubtopics = selectedSubtopics.size
        ? Array.from(selectedSubtopics).map((st) => (st === 'General' ? '' : st))
        : undefined;
      const { data } = await pdfNotesApi.getSelectiveSections({
        topics: [...selectedTopics],
        subtopics: mappedSubtopics,
        count: count || undefined,
      });
      // Apply client-side difficulty + box filters
      let filtered = data;
      if (filterDifficulty.length > 0) {
        filtered = filtered.filter(s => filterDifficulty.includes(s.difficulty));
      }
      if (filterBox.length > 0) {
        filtered = filtered.filter(s => filterBox.includes(s.boxLevel ?? 0));
      }
      if (filtered.length === 0) {
        toast.error('No sections match your filters');
        return;
      }
      setSections(filtered);
    } catch {
      toast.error('Failed to load sections');
    } finally {
      setLoading(false);
    }
  };

  const selectedSectionCount = topicMap
    .filter((t) => selectedTopics.has(t.topic))
    .reduce((s, t) => s + t.sectionCount, 0);
  const sliderMax = Math.max(50, selectedSectionCount);

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
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Select Topics</h2>

        {topicMap.length === 0 && <p className="text-zinc-600 text-sm">No topics yet.</p>}

        <div className="space-y-3">
          {topicMap.map(({ topic, subtopics, sectionCount }) => (
            <div key={topic} className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedTopics.has(topic)}
                  onChange={() => toggleTopic(topic)}
                  className="w-4 h-4 accent-flat-green-500 rounded"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{topic}</span>
                </div>
                <span className="text-xs text-zinc-400 shrink-0">{sectionCount} sections</span>
              </label>

              {selectedTopics.has(topic) && subtopics.length > 0 && (
                <div className="ml-7 flex flex-wrap gap-2">
                  {subtopics.map((st) => (
                    <label key={st} className="flex items-center gap-1.5 cursor-pointer bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg px-3 py-1 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedSubtopics.has(st)}
                        onChange={() => toggleSubtopic(st)}
                        className="w-3 h-3 accent-flat-green-500"
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

      {/* Difficulty + Box filters */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Filter Sections</h2>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold text-zinc-400 w-20">Difficulty</span>
            {DIFFICULTIES.map(d => {
              const active = filterDifficulty.includes(d);
              const cls = d === 'Easy'
                ? active ? 'bg-green-500 text-white border-green-500' : 'border-green-200 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                : d === 'Medium'
                ? active ? 'bg-amber-500 text-white border-amber-500' : 'border-amber-200 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                : active ? 'bg-red-500 text-white border-red-500' : 'border-red-200 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20';
              return (
                <button
                  key={d}
                  onClick={() => toggleDifficulty(d)}
                  className={`px-3 py-1 rounded-full border text-xs font-bold transition-all ${cls}`}
                >
                  {d}
                </button>
              );
            })}
            {filterDifficulty.length > 0 && (
              <button onClick={() => setFilterDifficulty([])} className="text-xs text-zinc-400 hover:text-red-500 ml-1">Clear</button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold text-zinc-400 w-20">Box</span>
            {BOXES.map(b => {
              const active = filterBox.includes(b);
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
                  onClick={() => toggleBox(b)}
                  className={`px-3 py-1 rounded-full border text-xs font-bold transition-all ${active ? colorActive : colorIdle}`}
                >
                  Box {b}
                </button>
              );
            })}
            {filterBox.length > 0 && (
              <button onClick={() => setFilterBox([])} className="text-xs text-zinc-400 hover:text-red-500 ml-1">Clear</button>
            )}
          </div>

          {(filterDifficulty.length > 0 || filterBox.length > 0) && (
            <p className="text-xs text-zinc-400">Filters apply after topic selection — only matching sections will be reviewed.</p>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Number of Sections</h2>
          <span className="text-sm font-semibold text-flat-green-600 dark:text-flat-green-400 tabular-nums">
            {count === 0 ? 'All' : count}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={sliderMax}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-full accent-flat-green-500 h-1.5 rounded-full cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-zinc-400 font-medium">
          <span>All</span>
          <span>{sliderMax}</span>
        </div>
        <p className="text-xs text-zinc-500">Drag to 0 to include all sections from the selected topics.</p>
      </div>

      <Button
        variant="primary"
        className="w-full justify-center py-2.5"
        onClick={start}
        disabled={loading || selectedTopics.size === 0}
      >
        <ListChecks size={14} />
        {loading ? 'Loading...' : `Start Review${count ? ` · ${count} sections` : ''}`}
      </Button>
    </div>
  );
}
