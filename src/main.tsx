import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { App } from './App.tsx';
import { ThemeLoader } from './ThemeLoader.tsx';
import './index.css';

// PWA & Mobile Setup
const setupPWA = () => {
  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => console.log('SW registered: ', registration),
        (registrationError) => console.log('SW registration failed: ', registrationError)
      );
    });
  }

  // Inject Manifest Link
  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = '/manifest.json';
    document.head.appendChild(link);
  }
  
  // Inject Theme Color Meta
  if (!document.querySelector('meta[name="theme-color"]')) {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#ffffff';
    document.head.appendChild(meta);
  }
};

setupPWA();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeLoader storeId={null}>
      <App />
    </ThemeLoader>
  </StrictMode>,
);
