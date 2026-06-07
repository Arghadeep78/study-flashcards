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
        <Route path="/cards" element={<AllCards />} />
        <Route path="/cards/new" element={<CardForm />} />
        <Route path="/cards/:id/edit" element={<CardForm />} />
        <Route path="/study" element={<StudyMode />} />
        <Route path="/review/daily" element={<DailyReview />} />
        <Route path="/review/random" element={<RandomReview />} />
        <Route path="/review/selective" element={<SelectiveReview />} />
        <Route path="/review/weak" element={<WeakCards />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
