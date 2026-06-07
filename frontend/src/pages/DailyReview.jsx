import { useEffect, useState } from 'react';
import { cardsApi } from '../utils/api.js';
import useSettings from '../store/useSettings.js';
import ReviewSession from '../components/ui/ReviewSession.jsx';

export default function DailyReview() {
  const { dailyTarget } = useSettings();
  const [cards, setCards] = useState(null);

  useEffect(() => {
    cardsApi.getDue().then(({ data }) => {
      // cap at daily target, no shuffle — ordered by nextReview asc
      setCards(data.slice(0, dailyTarget));
    }).catch(() => setCards([]));
  }, [dailyTarget]);

  if (cards === null) return <div className="text-center mt-24 text-zinc-600">Loading...</div>;

  return (
    <ReviewSession
      cards={cards}
      title={`Daily Review · target ${dailyTarget}`}
      showRatings
    />
  );
}
