/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'soft': '0 10px 40px -10px rgba(0,0,0,0.08)',
        'soft-sm': '0 4px 20px -5px rgba(0,0,0,0.05)',
      },
      colors: {
        flat: {
          blue: { 50: '#eff6ff', 100: '#dbeafe', 500: '#3b82f6', 600: '#2563eb' },
          green: { 50: '#ecfdf5', 100: '#d1fae5', 500: '#10b981', 600: '#059669' },
          red: { 50: '#fef2f2', 100: '#fee2e2', 500: '#ef4444', 600: '#dc2626' },
          yellow: { 50: '#fffbeb', 100: '#fef3c7', 500: '#f59e0b', 600: '#d97706' },
          purple: { 50: '#faf5ff', 100: '#f3e8ff', 500: '#8b5cf6', 600: '#7c3aed' },
          dark: { 500: '#64748b', 600: '#475569', 800: '#1e293b', 900: '#0f172a' },
          light: { 100: '#f8fafc', 200: '#f1f5f9', 300: '#e2e8f0', 400: '#cbd5e1' },
        }
      }
    },
  },
  plugins: [],
};
