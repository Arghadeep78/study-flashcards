import { useEffect, useState } from 'react';
import { Flag, Pencil, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cardsApi } from '../utils/api.js';
import useCardStore from '../store/useCardStore.js';
import { DifficultyBadge, TopicBadge } from '../components/ui/Badge.jsx';
import ReviewSession from '../components/ui/ReviewSession.jsx';
import Button from '../components/ui/Button.jsx';

export default function WeakCards() {
  const navigate = useNavigate();
  const { toggleWeak } = useCardStore();
  const [cards, setCards] = useState(null);
  const [reviewing, setReviewing] = useState(false);

  const load = () => cardsApi.getWeak().then(({ data }) => setCards(data)).catch(() => setCards([]));

  useEffect(() => { load(); }, []);

  const handleUnmark = async (id) => {
    await toggleWeak(id);
    setCards((cs) => cs.filter((c) => c._id !== id));
  };

  if (reviewing && cards?.length) {
    return <ReviewSession cards={cards} title={`Weak Cards · ${cards.length}`} showRatings onComplete={() => { setReviewing(false); load(); }} />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Flag size={20} className="text-red-400" />
          <h1 className="text-2xl font-bold text-zinc-100">Weak Cards
            <span className="text-zinc-600 text-lg font-normal ml-2">({cards?.length ?? '…'})</span>
          </h1>
        </div>
        {cards?.length > 0 && (
          <Button variant="primary" onClick={() => setReviewing(true)}>
            <Flag size={14} /> Review All Weak
          </Button>
        )}
      </div>

      {cards === null && <div className="text-center py-16 text-zinc-600">Loading...</div>}

      {cards?.length === 0 && (
        <div className="text-center py-16 text-zinc-600">
          <Flag size={36} className="mx-auto mb-3 opacity-30" />
          <p>No weak cards marked yet.</p>
          <p className="text-xs mt-1">Flag cards with the <Flag size={11} className="inline" /> icon during any review session.</p>
        </div>
      )}

      <div className="space-y-2">
        {cards?.map((card) => (
          <div key={card._id} className="bg-zinc-900 border border-red-500/10 rounded-xl px-4 py-3 flex items-center gap-3 group hover:border-red-500/20 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-100 truncate">{card.title}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <TopicBadge topic={card.subtopic ? `${card.topic} › ${card.subtopic}` : card.topic} />
                <DifficultyBadge difficulty={card.difficulty} />
                {card.problemLink && (
                  <a href={card.problemLink} target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-zinc-400 transition-colors">
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" className="px-2 py-1" onClick={() => navigate(`/cards/${card._id}/edit`)}><Pencil size={13} /></Button>
              <Button variant="ghost" className="px-2 py-1 text-red-400 hover:text-red-300" onClick={() => handleUnmark(card._id)}>
                <Flag size={13} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
