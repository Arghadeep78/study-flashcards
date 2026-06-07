const difficultyColors = {
  Easy: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  Medium: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  Hard: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

export function DifficultyBadge({ difficulty }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColors[difficulty] ?? 'bg-zinc-700 text-zinc-300'}`}>
      {difficulty}
    </span>
  );
}

export function TopicBadge({ topic }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
      {topic}
    </span>
  );
}
