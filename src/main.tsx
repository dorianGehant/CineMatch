import React from 'react';
import { createRoot } from 'react-dom/client';
import { Menu } from './Menu';
import './css/style.css';
import { BrowserRouter } from 'react-router-dom';
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Menu />
    </BrowserRouter>
  </React.StrictMode>,
);
