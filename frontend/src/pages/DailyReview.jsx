import { useEffect, useState } from 'react';
import { cardsApi } from '../utils/api.js';
import useSettings from '../store/useSettings.js';
import ReviewSession from '../components/ui/ReviewSession.jsx';

export default function DailyReview() {
  const { dailyTarget, shuffleDaily } = useSettings();
  const [cards, setCards] = useState(null);

  useEffect(() => {
    cardsApi.getDue().then(({ data }) => {
      // backend returns Leitner-due cards, box 0 first
      let queue = data;
      if (shuffleDaily) {
        // Fisher-Yates — randomize order when the user prefers it over box-priority ordering
        queue = [...data];
        for (let i = queue.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [queue[i], queue[j]] = [queue[j], queue[i]];
        }
      }
      setCards(queue.slice(0, dailyTarget)); // cap at daily target
    }).catch(() => setCards([]));
  }, [dailyTarget, shuffleDaily]);

  if (cards === null) return <div className="text-center mt-24 text-zinc-600">Loading...</div>;

  return (
    <ReviewSession
      cards={cards}
      title={`Daily Review · target ${dailyTarget}`}
      showRatings
    />
  );
}
