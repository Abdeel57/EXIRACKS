import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'sonner';
import App from './App';
import './index.css';
import { registerServiceWorker } from './lib/pwa';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster theme="dark" richColors position="top-center" />
  </React.StrictMode>
);

// Registra el service worker (PWA instalable + notificaciones push).
registerServiceWorker();
