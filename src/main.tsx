import '@coveo/atomic/themes/coveo.css';
import '@fontsource-variable/nunito';
import './theme.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { readCoveoConfig } from './config.ts';
import { withoutUnsupportedUrlState } from './search/urlState.ts';

const root = document.getElementById('root');

if (root === null) {
  throw new Error('The page has no element with the id "root".');
}

const supportedHash = withoutUnsupportedUrlState(window.location.hash);
if (supportedHash !== window.location.hash) {
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${supportedHash}`);
}

createRoot(root).render(
  <StrictMode>
    <App config={readCoveoConfig(import.meta.env)} />
  </StrictMode>,
);
