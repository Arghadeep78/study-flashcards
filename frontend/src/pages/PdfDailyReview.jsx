import { useEffect, useState } from 'react';
import { pdfNotesApi } from '../utils/api.js';
import useSettings from '../store/useSettings.js';
import PdfReviewSession from '../components/ui/PdfReviewSession.jsx';

export default function PdfDailyReview() {
  const { dailyTarget, shuffleDaily } = useSettings();
  const [sections, setSections] = useState(null);

  useEffect(() => {
    pdfNotesApi.getDueSections().then(({ data }) => {
      let queue = data;
      if (shuffleDaily) {
        queue = [...data];
        for (let i = queue.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [queue[i], queue[j]] = [queue[j], queue[i]];
        }
      }
      setSections(queue.slice(0, dailyTarget));
    }).catch(() => setSections([]));
  }, [dailyTarget, shuffleDaily]);

  if (sections === null) return <div className="text-center mt-24 text-zinc-600">Loading...</div>;

  return (
    <PdfReviewSession
      sections={sections}
      title={`PDF Daily Review · target ${dailyTarget}`}
      showRatings
    />
  );
}
