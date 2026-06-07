import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 transition-colors duration-200">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 bg-white dark:bg-zinc-900 m-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 transition-colors duration-200">
        <Outlet />
      </main>
    </div>
  );
}
