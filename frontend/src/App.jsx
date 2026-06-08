import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import useSettings from './store/useSettings.js';
import Layout from './components/layout/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AllCards from './pages/AllCards.jsx';
import CardForm from './pages/CardForm.jsx';
import StudyMode from './pages/StudyMode.jsx';
import DailyReview from './pages/DailyReview.jsx';
import RandomReview from './pages/RandomReview.jsx';
import SelectiveReview from './pages/SelectiveReview.jsx';
import WeakCards from './pages/WeakCards.jsx';
import Settings from './pages/Settings.jsx';
import PdfNotes from './pages/PdfNotes.jsx';
import PdfViewer from './pages/PdfViewer.jsx';
import PdfDailyReview from './pages/PdfDailyReview.jsx';
import PdfRandomReview from './pages/PdfRandomReview.jsx';
import PdfSelectiveReview from './pages/PdfSelectiveReview.jsx';
import PdfWeakReview from './pages/PdfWeakReview.jsx';

export default function App() {
  const theme = useSettings(state => state.theme);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Flashcard routes */}
        <Route path="/flashcards" element={<AllCards />} />
        <Route path="/flashcards/cards/new" element={<CardForm />} />
        <Route path="/flashcards/cards/:id/edit" element={<CardForm />} />
        <Route path="/flashcards/study" element={<StudyMode />} />
        <Route path="/flashcards/review/daily" element={<DailyReview />} />
        <Route path="/flashcards/review/random" element={<RandomReview />} />
        <Route path="/flashcards/review/selective" element={<SelectiveReview />} />
        <Route path="/flashcards/review/weak" element={<WeakCards />} />

        {/* Legacy card routes — redirect to new paths */}
        <Route path="/cards" element={<Navigate to="/flashcards" replace />} />
        <Route path="/cards/new" element={<Navigate to="/flashcards/cards/new" replace />} />
        <Route path="/cards/:id/edit" element={<CardForm />} />
        <Route path="/study" element={<Navigate to="/flashcards/study" replace />} />
        <Route path="/review/daily" element={<Navigate to="/flashcards/review/daily" replace />} />
        <Route path="/review/random" element={<Navigate to="/flashcards/review/random" replace />} />
        <Route path="/review/selective" element={<Navigate to="/flashcards/review/selective" replace />} />
        <Route path="/review/weak" element={<Navigate to="/flashcards/review/weak" replace />} />

        {/* PDF Notes routes */}
        <Route path="/pdf-notes" element={<PdfNotes />} />
        <Route path="/pdf-notes/review/daily" element={<PdfDailyReview />} />
        <Route path="/pdf-notes/review/random" element={<PdfRandomReview />} />
        <Route path="/pdf-notes/review/selective" element={<PdfSelectiveReview />} />
        <Route path="/pdf-notes/review/weak" element={<PdfWeakReview />} />
        <Route path="/pdf-notes/:id" element={<PdfViewer />} />

        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
