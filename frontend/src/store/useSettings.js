import { create } from 'zustand';

const SETTINGS_KEY = 'dsa_settings';

function load() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) ?? {}; } catch { return {}; }
}

const useSettings = create((set, get) => ({
  dailyTarget: load().dailyTarget ?? 20,

  setSetting: (key, value) => {
    set({ [key]: value });
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...load(), [key]: value }));
  },
}));

export default useSettings;
