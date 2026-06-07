import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);

  if (!code?.trim()) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 text-sm">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 z-10 p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 transition-colors"
        title="Copy"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
      <SyntaxHighlighter
        language="cpp"
        style={vscDarkPlus}
        customStyle={{ margin: 0, padding: '1rem', background: '#0f0f11', fontSize: '0.8rem' }}
        wrapLongLines
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
