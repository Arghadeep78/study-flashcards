const variants = {
  primary: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  secondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700',
  danger: 'bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/20',
  ghost: 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200',
};

export default function Button({ variant = 'secondary', className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
