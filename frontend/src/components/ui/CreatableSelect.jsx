import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Plus, X } from 'lucide-react';

export default function CreatableSelect({
  label,
  value,
  onChange,
  defaultOptions = [],
  storageKey,
  placeholder = "Select...",
  required = false
}) {
  const [customOptions, setCustomOptions] = useState(() => {
    if (!storageKey) return [];
    try { return JSON.parse(localStorage.getItem(storageKey)) ?? []; } catch { return []; }
  });

  const allOptions = [...new Set([...defaultOptions, ...customOptions])].sort();

  const [open, setOpen] = useState(false);
  const [newOption, setNewOption] = useState('');
  const [filter, setFilter] = useState('');
  const [dropRect, setDropRect] = useState(null);
  const ref = useRef();
  const btnRef = useRef();
  const dropRef = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (
        ref.current && !ref.current.contains(e.target) &&
        dropRef.current && !dropRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openDropdown = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropRect({ top: r.bottom + window.scrollY, left: r.left + window.scrollX, width: r.width });
    }
    // Re-sync custom options from localStorage so sibling instances see each other's additions
    if (storageKey) {
      try {
        const stored = JSON.parse(localStorage.getItem(storageKey)) ?? [];
        setCustomOptions(stored);
      } catch { /* ignore */ }
    }
    setOpen((o) => !o);
    setFilter('');
  };

  const addCustomOption = () => {
    const opt = newOption.trim();
    if (!opt || allOptions.includes(opt)) return;
    const updated = [...customOptions, opt];
    setCustomOptions(updated);
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated));
    onChange(opt);
    setNewOption('');
    setOpen(false);
  };

  const removeCustomOption = (opt, e) => {
    e.stopPropagation();
    const updated = customOptions.filter((c) => c !== opt);
    setCustomOptions(updated);
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated));
    if (value === opt) onChange('');
  };

  const filtered = allOptions.filter((o) => o.toLowerCase().includes(filter.toLowerCase()));

  const dropdown = open && dropRect && createPortal(
    <div
      ref={dropRef}
      style={{ position: 'absolute', top: dropRect.top + 4, left: dropRect.left, width: dropRect.width, zIndex: 99999 }}
      className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden"
    >
      <div className="p-2 border-b border-zinc-200 dark:border-zinc-800">
        <input
          autoFocus
          type="text"
          placeholder="Search..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-flat-blue-500"
        />
      </div>
      <div className="max-h-48 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-xs text-zinc-600 px-3 py-2">No match — add below</p>
        )}
        {filtered.map((opt) => (
          <div
            key={opt}
            onMouseDown={(e) => { e.preventDefault(); onChange(opt); setOpen(false); }}
            className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors ${value === opt ? 'bg-flat-blue-500/10 text-flat-blue-500' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
          >
            <span>{opt}</span>
            {customOptions.includes(opt) && (
              <button
                type="button"
                onMouseDown={(e) => { e.stopPropagation(); removeCustomOption(opt, e); }}
                className="text-zinc-600 hover:text-red-400 transition-colors ml-2"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 flex gap-2">
        <input
          type="text"
          placeholder="Add new..."
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomOption())}
          className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-flat-blue-500"
        />
        <button
          type="button"
          onClick={addCustomOption}
          className="px-2.5 py-1.5 bg-flat-blue-600 hover:bg-flat-blue-500 text-white rounded-lg text-xs font-medium transition-colors"
        >
          <Plus size={13} />
        </button>
      </div>
    </div>,
    document.body
  );

  return (
    <div ref={ref} className="relative">
      {label && <label className="block text-xs text-zinc-500 mb-1">{label}{required && ' *'}</label>}
      <button
        ref={btnRef}
        type="button"
        onClick={openDropdown}
        className="w-full flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-left focus:outline-none focus:border-flat-blue-500 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
      >
        <span className={value ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-400 dark:text-zinc-600'}>{value || placeholder}</span>
        <ChevronDown size={14} className={`text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {dropdown}
    </div>
  );
}
