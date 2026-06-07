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
    <aside className="w-64 flex-shrink-0 flex flex-col py-6 px-4 gap-1 bg-white dark:bg-slate-900 shadow-soft z-10 transition-colors duration-200">
      <div className="px-3 mb-8 flex items-center justify-between">
        <span className="text-xl font-black text-flat-blue-600 dark:text-flat-blue-500 tracking-tight font-sans">
          DSA Cards
        </span>
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors focus:outline-none"
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
                    `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-extrabold tracking-wide transition-all duration-300 ${
                      isActive
                        ? 'bg-flat-blue-50 text-flat-blue-600 dark:bg-flat-blue-600/10 dark:text-flat-blue-500'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:pl-5'
                    }`
                  }
                >
                  <Icon size={18} className={({ isActive }) => isActive ? 'text-flat-blue-600 dark:text-flat-blue-500' : ''} />
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
