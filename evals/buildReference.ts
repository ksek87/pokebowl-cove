import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { readCoveoConfig } from '../src/config.ts';
import { fetchIndexedItems } from './coveoIndex.ts';
import { pageName } from './indexQuality.ts';
import { parsePokemonPage, type PokemonValues } from './pokemonPage.ts';
import { chooseSample, fetchPaced } from './sample.ts';

const SITE_INTERVAL_MS = 2000;
const SAMPLE_SIZE = 40;
const JSON_INDENT = 2;
const OUTPUT_DIRECTORY = new URL('./reference/', import.meta.url);
const SITE = 'https://pokemondb.net/pokedex';

// Pages likely to expose extraction problems: forms, punctuation, digits and new Pokémon.
const DIFFICULT_PAGES = [
  'charizard',
  'mr-mime',
  'porygon2',
  'rotom',
  'browt',
  'gecqua',
  'pombon',
  'farfetchd',
  'nidoran-f',
  'ho-oh',
  'type-null',
  'flabebe',
  'deoxys',
  'wormadam',
  'urshifu',
  'zygarde',
];

async function fetchPage(name: string): Promise<[string, PokemonValues]> {
  const response = await fetch(`${SITE}/${name}`, { headers: { 'user-agent': 'pokebowl-eval' } });
  if (!response.ok) {
    throw new Error(`${name} returned ${response.status}.`);
  }
  return [name, parsePokemonPage(await response.text())];
}

async function main(): Promise<void> {
  const items = await fetchIndexedItems(readCoveoConfig(process.env));
  const names = items.map((item): string | null => pageName(item.clickUri)).filter((name) => name !== null);
  const sample = chooseSample(names, DIFFICULT_PAGES, SAMPLE_SIZE);

  const entries = await fetchPaced(sample, {
    request: fetchPage,
    wait: (ms): Promise<void> => delay(ms),
    intervalMs: SITE_INTERVAL_MS,
  });

  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  const sorted = Object.fromEntries(entries.sort(([first], [second]): number => first.localeCompare(second)));
  await writeFile(new URL('pokemon.json', OUTPUT_DIRECTORY), `${JSON.stringify(sorted, null, JSON_INDENT)}\n`);
  console.log(`Saved ${entries.length} reference pages.`);
}

main().catch((error: unknown): void => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
