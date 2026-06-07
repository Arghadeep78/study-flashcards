const difficultyColors = {
  Easy: 'bg-flat-green-500 text-white',
  Medium: 'bg-flat-yellow-500 text-white',
  Hard: 'bg-flat-red-500 text-white',
};

export function DifficultyBadge({ difficulty }) {
  return (
    <span className={`text-[11px] px-2.5 py-1 rounded shadow-sm font-bold uppercase tracking-wider ${difficultyColors[difficulty] ?? 'bg-zinc-500 text-white'}`}>
      {difficulty}
    </span>
  );
}

export function TopicBadge({ topic }) {
  return (
    <span className="text-[11px] px-2.5 py-1 rounded shadow-sm bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200 font-bold uppercase tracking-wider">
      {topic}
    </span>
  );
}
