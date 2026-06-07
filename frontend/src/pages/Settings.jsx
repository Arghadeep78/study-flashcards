import { useRef } from 'react';
import { Sun, Moon, Download, Upload } from 'lucide-react';
import useSettings from '../store/useSettings.js';
import useCardStore from '../store/useCardStore.js';
import Button from '../components/ui/Button.jsx';
import toast from 'react-hot-toast';

function Toggle({ on, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${on ? 'bg-emerald-600' : 'bg-zinc-700'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function Row({ title, desc, children }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{title}</p>
        {desc && <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function Settings() {
  const { dailyTarget, theme, autoReveal, shuffleDaily, confirmDelete, setSetting } = useSettings();
  const { exportCards, importCards } = useCardStore();
  const fileRef = useRef(null);

  const handleTarget = (e) => {
    const v = Math.max(1, Math.min(200, parseInt(e.target.value) || 1));
    setSetting('dailyTarget', v);
  };

  const toggle = (key, label) => (value) => {
    setSetting(key, value);
    toast.success(`${label} ${value ? 'enabled' : 'disabled'}`);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (file) await importCards(file);
    e.target.value = ''; // allow re-importing the same file
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-12">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h1>

      {/* Review */}
      <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-5">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Review</h2>

        <Row title="Daily Review Target" desc="Number of cards you aim to review each day">
          <input
            type="number"
            min={1}
            max={200}
            value={dailyTarget}
            onChange={handleTarget}
            className="w-20 text-center bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-emerald-600"
          />
        </Row>

        <Row title="Auto-reveal answers" desc="Show every tab immediately instead of revealing them step by step">
          <Toggle on={autoReveal} onChange={toggle('autoReveal', 'Auto-reveal')} />
        </Row>

        <Row title="Shuffle daily queue" desc="Randomize order instead of showing Box 0 cards first">
          <Toggle on={shuffleDaily} onChange={toggle('shuffleDaily', 'Shuffle')} />
        </Row>
      </section>

      {/* Appearance */}
      <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-5">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Appearance</h2>

        <Row title="Theme" desc="Switch between light and dark mode">
          <div className="flex gap-1 p-0.5 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-lg">
            {[['light', 'Light', Sun], ['dark', 'Dark', Moon]].map(([val, label, Icon]) => {
              const active = theme === val;
              return (
                <button
                  key={val}
                  onClick={() => setSetting('theme', val)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${active ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-300'}`}
                >
                  <Icon size={13} /> {label}
                </button>
              );
            })}
          </div>
        </Row>
      </section>

      {/* Behaviour */}
      <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-5">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Behaviour</h2>

        <Row title="Confirm before deleting" desc="Require a second click on the delete button">
          <Toggle on={confirmDelete} onChange={toggle('confirmDelete', 'Delete confirmation')} />
        </Row>
      </section>

      {/* Data */}
      <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-5">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Data</h2>

        <Row title="Export deck" desc="Download all cards as a JSON file">
          <Button onClick={exportCards}><Download size={14} /> Export</Button>
        </Row>

        <Row title="Import deck" desc="Load cards from a previously exported JSON file">
          <Button onClick={() => fileRef.current?.click()}><Upload size={14} /> Import</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleImport} className="hidden" />
        </Row>
      </section>

      {/* Reference: Leitner box thresholds */}
      <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-4">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Leitner Box System</h2>
        <p className="text-xs text-zinc-500">
          Answer <span className="text-emerald-400 font-medium">Correct</span> to promote a card to the next box;
          answer <span className="text-red-400 font-medium">Missed</span> to send it back to Box 0. A card becomes due again once its box interval has elapsed.
        </p>
        <div className="grid grid-cols-3 gap-3 text-sm">
          {[['Box 0', 'Today', 'text-red-400'], ['Box 1', '3 days', 'text-amber-400'], ['Box 2', '7 days', 'text-emerald-400']].map(([label, days, cls]) => (
            <div key={label} className="flex flex-col items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg px-4 py-3">
              <span className={`font-semibold ${cls}`}>{label}</span>
              <span className="text-zinc-400 text-xs">{days}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-zinc-500">
          Answering <span className="text-emerald-400 font-medium">Correct</span> on a Box 2 card archives it — it has graduated the deck.
        </p>
      </section>
    </div>
  );
}
