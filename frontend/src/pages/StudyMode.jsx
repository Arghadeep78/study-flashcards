import { useEffect, useState } from 'react';
import { cardsApi } from '../utils/api.js';
import ReviewSession from '../components/ui/ReviewSession.jsx';

export default function StudyMode() {
  const [cards, setCards] = useState(null);

  useEffect(() => {
    cardsApi.getDue().then(({ data }) => setCards(data)).catch(() => setCards([]));
  }, []);

  if (cards === null) return <div className="text-center mt-24 text-zinc-600">Loading...</div>;

  return <ReviewSession cards={cards} title="Study — Due Cards" showRatings />;
}
