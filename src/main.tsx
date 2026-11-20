import React from 'react';
import { createRoot } from 'react-dom/client';
import { MainPage } from './index';
import './style.css';
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MainPage />
  </React.StrictMode>,
);
