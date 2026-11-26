import React from 'react';
import { createRoot } from 'react-dom/client';
import { Menu } from './Menu';
import './style.css';
import { TMDBCreditsFooter } from './components/TMBDCreditsFooter';
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Menu />
    <TMDBCreditsFooter />
  </React.StrictMode>,
);
