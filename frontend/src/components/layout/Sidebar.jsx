import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, CalendarCheck,
  Shuffle, ListChecks, Flag, Settings as SettingsIcon,
} from 'lucide-react';
import useSettings from '../../store/useSettings.js';
import { Moon, Sun } from 'lucide-react';

const sections = [
  {
    label: null,
    links: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/cards', icon: BookOpen, label: 'All Cards' },
    ],
  },
  {
    label: 'Review',
    links: [
      { to: '/review/daily', icon: CalendarCheck, label: 'Daily Review' },
      { to: '/review/random', icon: Shuffle, label: 'Random' },
      { to: '/review/selective', icon: ListChecks, label: 'Selective' },
      { to: '/review/weak', icon: Flag, label: 'Weak Cards' },
    ],
  },
  {
    label: null,
    links: [
      { to: '/settings', icon: SettingsIcon, label: 'Settings' },
    ],
  },
];

export default function Sidebar() {
  const { theme, toggleTheme } = useSettings();

  return (
    <aside className="w-64 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 flex flex-col py-6 px-4 gap-1 bg-zinc-50 dark:bg-zinc-950 transition-colors duration-200">
      <div className="px-3 mb-8 flex items-center justify-between">
        <span className="text-xl font-bold text-flat-blue-500 dark:text-flat-blue-500 tracking-tight font-sans">
          DSA Cards
        </span>
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors focus:outline-none"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sections.map((section, si) => (
          <div key={si} className="mb-6">
            {section.label && (
              <p className="px-3 mb-2 text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">
                {section.label}
              </p>
            )}
            <div className="space-y-1">
              {section.links.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-flat-blue-500 text-white shadow-sm'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
                    }`
                  }
                >
                  <Icon size={18} className={({ isActive }) => isActive ? 'text-white' : ''} />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
