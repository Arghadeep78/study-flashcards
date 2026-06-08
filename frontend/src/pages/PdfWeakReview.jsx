import { useEffect, useState } from 'react';
import { Flag } from 'lucide-react';
import { pdfNotesApi } from '../utils/api.js';
import PdfReviewSession from '../components/ui/PdfReviewSession.jsx';
import toast from 'react-hot-toast';

export default function PdfWeakReview() {
  const [sections, setSections] = useState(null);

  useEffect(() => {
    pdfNotesApi.getWeakSections()
      .then(({ data }) => setSections(data))
      .catch(() => { toast.error('Failed to load weak sections'); setSections([]); });
  }, []);

  if (sections === null) return <div className="text-center mt-24 text-zinc-600">Loading...</div>;

  return (
    <PdfReviewSession
      sections={sections}
      title={`PDF Weak Sections · ${sections.length}`}
      showRatings
    />
  );
}
