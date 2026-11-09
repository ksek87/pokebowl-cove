import '@coveo/atomic/themes/coveo.css';
import '@fontsource-variable/nunito';
import './theme.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { readCoveoConfig } from './config.ts';
import { pokemonNameFromUrl } from './search/pokemonDetail.ts';
import { PokemonDetailPage } from './search/PokemonDetailPage.tsx';
import { withoutUnsupportedUrlState } from './search/urlState.ts';

const root = document.getElementById('root');

if (root === null) {
  throw new Error('The page has no element with the id "root".');
}

const supportedHash = withoutUnsupportedUrlState(window.location.hash);
if (supportedHash !== window.location.hash) {
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${supportedHash}`);
}

// Each value is named, so Vite inlines only these two and no other build variable reaches the browser.
const config = readCoveoConfig({
  VITE_COVEO_ORGANIZATION_ID: import.meta.env.VITE_COVEO_ORGANIZATION_ID,
  VITE_COVEO_SEARCH_API_KEY: import.meta.env.VITE_COVEO_SEARCH_API_KEY,
});
const pokemonName = pokemonNameFromUrl(window.location.search);

createRoot(root).render(
  <StrictMode>
    {pokemonName ? <PokemonDetailPage config={config} name={pokemonName} /> : <App config={config} />}
  </StrictMode>,
);
