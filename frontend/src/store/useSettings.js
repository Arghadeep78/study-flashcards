import { create } from 'zustand';

const SETTINGS_KEY = 'dsa_settings';

function load() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) ?? {}; } catch { return {}; }
}

const useSettings = create((set, get) => ({
  dailyTarget: load().dailyTarget ?? 20,
  theme: load().theme ?? 'light',
  autoReveal: load().autoReveal ?? false,
  shuffleDaily: load().shuffleDaily ?? false,
  confirmDelete: load().confirmDelete ?? true,

  setSetting: (key, value) => {
    set({ [key]: value });
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...load(), [key]: value }));
  },
  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light';
    set({ theme: newTheme });
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...load(), theme: newTheme }));
  }
}));

export default useSettings;
