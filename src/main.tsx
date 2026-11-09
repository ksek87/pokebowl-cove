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

const config = readCoveoConfig(import.meta.env);
const pokemonName = pokemonNameFromUrl(window.location.search);

createRoot(root).render(
  <StrictMode>
    {pokemonName ? <PokemonDetailPage config={config} name={pokemonName} /> : <App config={config} />}
  </StrictMode>,
);
