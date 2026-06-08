import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, CalendarCheck,
  Shuffle, ListChecks, Flag, Settings as SettingsIcon,
  FileText, ChevronDown, ChevronRight, Layers,
  Moon, Sun, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import useSettings from '../../store/useSettings.js';

export default function Sidebar() {
  const { theme, toggleTheme } = useSettings();
  const location = useLocation();

  const flashcardOpen = location.pathname.startsWith('/flashcards');
  const pdfOpen = location.pathname.startsWith('/pdf-notes');

  const [fcExpanded, setFcExpanded] = useState(flashcardOpen || (!flashcardOpen && !pdfOpen));
  const [pdfExpanded, setPdfExpanded] = useState(pdfOpen);
  const [collapsed, setCollapsed] = useState(false);

  // ── style helpers ──────────────────────────────────────────────────────────
  const linkCls = (isActive) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-extrabold tracking-wide transition-all duration-200 ${
      isActive
        ? 'bg-flat-blue-50 text-flat-blue-600 dark:bg-flat-blue-600/10 dark:text-flat-blue-500'
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
    }`;

  const subLinkCls = (isActive) =>
    `flex items-center gap-2.5 pl-9 pr-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 ${
      isActive
        ? 'bg-flat-blue-50 text-flat-blue-600 dark:bg-flat-blue-600/10 dark:text-flat-blue-500'
        : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
    }`;

  const iconBtnCls = (isActive = false) =>
    `flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-200 ${
      isActive
        ? 'bg-flat-blue-50 text-flat-blue-600 dark:bg-flat-blue-600/10 dark:text-flat-blue-500'
        : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`;

  // ── collapsed icon rail ────────────────────────────────────────────────────
  if (collapsed) {
    return (
      <aside
        style={{ width: '4rem', transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)' }}
        className="flex-shrink-0 flex flex-col items-center py-4 gap-1 bg-white dark:bg-slate-900 shadow-soft z-10 transition-colors duration-200"
      >
        {/* Logo dot */}
        <div className="w-8 h-8 rounded-xl bg-flat-blue-500 flex items-center justify-center mb-6 flex-shrink-0">
          <span className="text-white font-black text-xs">D</span>
        </div>

        <div className="flex-1 flex flex-col items-center gap-1 w-full px-2">
          {/* Dashboard */}
          <NavLink to="/dashboard" title="Dashboard" className={({ isActive }) => iconBtnCls(isActive)}>
            <LayoutDashboard size={18} />
          </NavLink>

          {/* Flashcards */}
          <NavLink
            to="/flashcards"
            title="Flashcards"
            className={({ isActive }) => iconBtnCls(isActive || flashcardOpen)}
          >
            <Layers size={18} />
          </NavLink>

          {/* PDF Notes */}
          <NavLink
            to="/pdf-notes"
            title="PDF Notes"
            className={({ isActive }) => iconBtnCls(isActive || pdfOpen)}
          >
            <FileText size={18} />
          </NavLink>

          {/* Settings */}
          <NavLink to="/settings" title="Settings" className={({ isActive }) => iconBtnCls(isActive)}>
            <SettingsIcon size={18} />
          </NavLink>
        </div>

        {/* Bottom controls */}
        <div className="flex flex-col items-center gap-2 pb-2">
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            className={iconBtnCls()}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={() => setCollapsed(false)}
            title="Expand sidebar"
            className={iconBtnCls()}
          >
            <PanelLeftOpen size={18} />
          </button>
        </div>
      </aside>
    );
  }

  // ── expanded sidebar ───────────────────────────────────────────────────────
  return (
    <aside
      style={{ width: '16rem', transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)' }}
      className="flex-shrink-0 flex flex-col py-6 px-4 gap-1 bg-white dark:bg-slate-900 shadow-soft z-10 transition-colors duration-200"
    >
      {/* Header */}
      <div className="px-3 mb-8 flex items-center justify-between">
        <span className="text-xl font-black text-flat-blue-600 dark:text-flat-blue-500 tracking-tight font-sans">
          DSA Cards
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors focus:outline-none"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => setCollapsed(true)}
            title="Collapse sidebar"
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1">
        {/* Dashboard */}
        <NavLink to="/dashboard" className={({ isActive }) => linkCls(isActive)}>
          <LayoutDashboard size={18} /> Dashboard
        </NavLink>

        {/* Flashcards section */}
        <div>
          <button
            onClick={() => setFcExpanded((v) => !v)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-extrabold tracking-wide transition-all duration-300 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            <Layers size={18} />
            <span className="flex-1 text-left">Flashcards</span>
            {fcExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {fcExpanded && (
            <div className="mt-1 space-y-0.5">
              <NavLink to="/flashcards" end className={({ isActive }) => subLinkCls(isActive)}>
                <BookOpen size={14} /> All Cards
              </NavLink>
              <p className="pl-9 pt-1 pb-0.5 text-[10px] font-black text-zinc-400 uppercase tracking-wider">Review</p>
              <NavLink to="/flashcards/review/daily" className={({ isActive }) => subLinkCls(isActive)}>
                <CalendarCheck size={14} /> Daily
              </NavLink>
              <NavLink to="/flashcards/review/random" className={({ isActive }) => subLinkCls(isActive)}>
                <Shuffle size={14} /> Random
              </NavLink>
              <NavLink to="/flashcards/review/selective" className={({ isActive }) => subLinkCls(isActive)}>
                <ListChecks size={14} /> Selective
              </NavLink>
              <NavLink to="/flashcards/review/weak" className={({ isActive }) => subLinkCls(isActive)}>
                <Flag size={14} /> Weak Cards
              </NavLink>
            </div>
          )}
        </div>

        {/* PDF Notes section */}
        <div>
          <button
            onClick={() => setPdfExpanded((v) => !v)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-extrabold tracking-wide transition-all duration-300 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            <FileText size={18} />
            <span className="flex-1 text-left">PDF Notes</span>
            {pdfExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {pdfExpanded && (
            <div className="mt-1 space-y-0.5">
              <NavLink to="/pdf-notes" end className={({ isActive }) => subLinkCls(isActive)}>
                <FileText size={14} /> All Notes
              </NavLink>
              <p className="pl-9 pt-1 pb-0.5 text-[10px] font-black text-zinc-400 uppercase tracking-wider">Review</p>
              <NavLink to="/pdf-notes/review/daily" className={({ isActive }) => subLinkCls(isActive)}>
                <CalendarCheck size={14} /> Daily
              </NavLink>
              <NavLink to="/pdf-notes/review/random" className={({ isActive }) => subLinkCls(isActive)}>
                <Shuffle size={14} /> Random
              </NavLink>
              <NavLink to="/pdf-notes/review/selective" className={({ isActive }) => subLinkCls(isActive)}>
                <ListChecks size={14} /> Selective
              </NavLink>
              <NavLink to="/pdf-notes/review/weak" className={({ isActive }) => subLinkCls(isActive)}>
                <Flag size={14} /> Weak Sections
              </NavLink>
            </div>
          )}
        </div>

        <div className="pt-2">
          <NavLink to="/settings" className={({ isActive }) => linkCls(isActive)}>
            <SettingsIcon size={18} /> Settings
          </NavLink>
        </div>
      </div>
    </aside>
  );
}
