import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n'; // Initialise i18next avant le rendu de l'app
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
