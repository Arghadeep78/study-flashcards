/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Lato', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        flat: {
          blue: { 500: '#3498db', 600: '#2980b9' },
          green: { 500: '#2ecc71', 600: '#27ae60' },
          red: { 500: '#e74c3c', 600: '#c0392b' },
          yellow: { 500: '#f1c40f', 600: '#f39c12' },
          purple: { 500: '#9b59b6', 600: '#8e44ad' },
          dark: { 500: '#34495e', 600: '#2c3e50', 800: '#22313f', 900: '#1a252f' },
          light: { 100: '#ecf0f1', 200: '#bdc3c7', 300: '#95a5a6', 400: '#7f8c8d' },
        }
      }
    },
  },
  plugins: [],
};
