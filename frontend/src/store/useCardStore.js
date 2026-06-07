import { create } from 'zustand';
import { cardsApi, statsApi } from '../utils/api.js';
import toast from 'react-hot-toast';

const useCardStore = create((set, get) => ({
  cards: [],
  total: 0,
  page: 1,
  pages: 1,
  topics: [],
  stats: null,
  dueCards: [],
  loading: false,
  filters: { search: '', topic: '', subtopic: '', difficulty: '' },

  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters }, page: 1 })),
  setPage: (page) => { set({ page }); get().fetchCards(); },

  fetchCards: async () => {
    set({ loading: true });
    try {
      const { filters, page } = get();
      const { data } = await cardsApi.getAll({ ...filters, page, limit: 50 });
      set({ cards: data.cards, total: data.total, pages: data.pages });
    } catch {
      toast.error('Failed to load cards');
    } finally {
      set({ loading: false });
    }
  },

  fetchTopics: async () => {
    try {
      const { data } = await cardsApi.getTopics();
      // data is [{topic, subtopics}] — store the full objects
      set({ topics: data });
    } catch {}
  },

  fetchStats: async () => {
    try {
      const { data } = await statsApi.get();
      set({ stats: data });
    } catch {}
  },

  fetchDueCards: async () => {
    try {
      const { data } = await cardsApi.getDue();
      set({ dueCards: data });
    } catch {}
  },

  createCard: async (cardData) => {
    const { data } = await cardsApi.create(cardData);
    set((s) => ({ cards: [data, ...s.cards], total: s.total + 1 }));
    toast.success('Card created');
    return data;
  },

  updateCard: async (id, cardData) => {
    const { data } = await cardsApi.update(id, cardData);
    set((s) => ({ cards: s.cards.map((c) => (c._id === id ? data : c)) }));
    toast.success('Card updated');
    return data;
  },

  deleteCard: async (id) => {
    await cardsApi.remove(id);
    set((s) => ({ cards: s.cards.filter((c) => c._id !== id), total: s.total - 1 }));
    toast.success('Card deleted');
  },

  duplicateCard: async (id) => {
    const { data } = await cardsApi.duplicate(id);
    set((s) => ({ cards: [data, ...s.cards], total: s.total + 1 }));
    toast.success('Card duplicated');
    return data;
  },

  reviewCard: async (id, rating) => {
    const { data } = await cardsApi.review(id, rating);
    set((s) => ({
      dueCards: s.dueCards.filter((c) => c._id !== id),
      cards: s.cards.map((c) => (c._id === id ? data : c)),
    }));
    return data;
  },

  toggleWeak: async (id) => {
    const { data } = await cardsApi.toggleWeak(id);
    set((s) => ({
      cards: s.cards.map((c) => (c._id === id ? data : c)),
      dueCards: s.dueCards.map((c) => (c._id === id ? data : c)),
    }));
    return data;
  },

  exportCards: async () => {
    const { data } = await cardsApi.export();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dsa-flashcards-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported successfully');
  },

  importCards: async (file) => {
    const text = await file.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      toast.error('Invalid JSON file');
      return;
    }
    const cards = parsed.cards ?? parsed;
    const { data } = await cardsApi.import(cards);
    toast.success(`Imported ${data.imported} cards`);
    get().fetchCards();
    get().fetchStats();
  },
}));

export default useCardStore;
