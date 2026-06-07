import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, CalendarCheck,
  Shuffle, ListChecks, Flag, Settings,
} from 'lucide-react';

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
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export default function Sidebar() {
  return (
    <aside className="w-56 flex-shrink-0 border-r border-zinc-800 flex flex-col py-6 px-3 gap-1">
      <div className="px-3 mb-6">
        <span className="text-lg font-bold text-emerald-400 tracking-tight font-mono">DSA Cards</span>
      </div>

      {sections.map((section, si) => (
        <div key={si} className="mb-2">
          {section.label && (
            <p className="px-3 mb-1 mt-2 text-xs font-semibold text-zinc-600 uppercase tracking-wider">{section.label}</p>
          )}
          {section.links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </div>
      ))}
    </aside>
  );
}
