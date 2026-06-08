import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './index.css';

// createBrowserRouter (data router) is required for useBlocker to work.
// App renders its own <Routes> inside, which is valid inside a data router.
const router = createBrowserRouter([{ path: '*', element: <App /> }]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <Toaster
      position="bottom-right"
      toastOptions={{
        className: 'dark:bg-zinc-800 dark:text-zinc-100 text-sm',
        duration: 2500,
      }}
    />
  </React.StrictMode>
);
