const variants = {
  primary: 'bg-flat-blue-500 hover:bg-flat-blue-600 text-white shadow-soft-sm hover:shadow-soft hover:-translate-y-0.5',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 shadow-sm hover:shadow-soft-sm hover:-translate-y-0.5',
  danger: 'bg-flat-red-500 hover:bg-flat-red-600 text-white shadow-soft-sm hover:shadow-soft hover:-translate-y-0.5',
  ghost: 'hover:bg-slate-100 text-slate-600 hover:text-slate-900 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-800 dark:text-slate-200',
};

export default function Button({ variant = 'secondary', className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-extrabold tracking-wide transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
