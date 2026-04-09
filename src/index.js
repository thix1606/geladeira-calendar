import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';
import App from './App';

// Se estiver dentro de um iframe (refresh silencioso do OAuth), apenas repassa o hash
// ao parent e para — não renderiza o app inteiro no iframe.
if (window !== window.top) {
  try { window.top.postMessage(window.location.hash, window.location.origin); } catch {}
} else {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
