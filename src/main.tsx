import '@coveo/atomic/themes/coveo.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { readCoveoConfig } from './config';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App config={readCoveoConfig(import.meta.env)} />
  </StrictMode>,
);
