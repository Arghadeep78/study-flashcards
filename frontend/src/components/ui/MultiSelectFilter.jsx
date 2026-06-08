import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function MultiSelectFilter({ options, selected = [], onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (opt) => {
    if (selected.includes(opt)) onChange(selected.filter((o) => o !== opt));
    else onChange([...selected, opt]);
  };

  const displayText = selected.length === 0 
    ? placeholder 
    : selected.length === 1 
      ? selected[0] 
      : `${selected.length} selected`;

  return (
    <div ref={ref} className="relative min-w-[160px]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-left focus:outline-none focus:border-flat-blue-500 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
      >
        <span className={`truncate pr-2 ${selected.length > 0 ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-500'}`}>
          {displayText}
        </span>
        <ChevronDown size={14} className={`text-zinc-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] max-h-60 overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-xl py-1">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-sm text-zinc-700 dark:text-zinc-300 transition-colors">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="rounded border-zinc-300 dark:border-zinc-700 text-flat-blue-600 focus:ring-flat-blue-500 dark:bg-zinc-800"
              />
              <span className="truncate">{opt}</span>
            </label>
          ))}
          {options.length === 0 && (
            <div className="px-3 py-2 text-sm text-zinc-500 italic">No options</div>
          )}
        </div>
      )}
    </div>
  );
}
