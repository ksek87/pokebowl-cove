import type { IndexedItem } from './coveoIndex.ts';
import type { PokemonValues } from './pokemonPage.ts';

const POKEMON_PAGE = /^https:\/\/pokemondb\.net\/pokedex\/(?<name>[^/]+)$/;
const LIST_PAGES = new Set(['all', 'national', 'shiny']);

export interface Mismatch {
  page: string;
  field: string;
  expected: unknown;
  actual: unknown;
}

export interface IndexReport {
  passed: boolean;
  itemCount: { expected: number; actual: number };
  pagesCompared: number;
  mismatches: Mismatch[];
  missingPages: string[];
  nonPokemonPages: string[];
  duplicatePages: string[];
}

export function pageName(url: string): string | null {
  const name = POKEMON_PAGE.exec(url)?.groups?.name;
  return name && !LIST_PAGES.has(name) ? name : null;
}

export function isPokemonPage(url: string): boolean {
  return pageName(url) !== null;
}

function readTypes(value: unknown): string[] {
  const values = Array.isArray(value) ? value.map(String) : String(value ?? '').split(';');
  return values.filter(Boolean).sort();
}

function compare(page: string, expected: PokemonValues, item: IndexedItem): Mismatch[] {
  const actual = {
    name: item.raw.pokemon_name,
    number: item.raw.pokemon_number,
    types: readTypes(item.raw.pokemon_type),
    generation: item.raw.pokemon_generation,
    image: item.raw.pokemon_image,
  };
  const wanted = { ...expected, types: [...expected.types].sort() };

  return (Object.keys(wanted) as (keyof PokemonValues)[])
    .filter((field): boolean => JSON.stringify(wanted[field]) !== JSON.stringify(actual[field]))
    .map((field): Mismatch => ({ page, field, expected: wanted[field], actual: actual[field] }));
}

export function buildIndexReport(
  items: IndexedItem[],
  reference: Record<string, PokemonValues>,
  expectedCount: number,
): IndexReport {
  const byPage = new Map(items.map((item): [string, IndexedItem] => [pageName(item.clickUri) ?? item.clickUri, item]));
  const uris = items.map((item): string => item.clickUri);
  const compared = Object.entries(reference).filter(([page]): boolean => byPage.has(page));
  const report = {
    itemCount: { expected: expectedCount, actual: items.length },
    pagesCompared: compared.length,
    mismatches: compared.flatMap(([page, values]) => compare(page, values, byPage.get(page) as IndexedItem)),
    missingPages: Object.keys(reference).filter((page): boolean => !byPage.has(page)),
    nonPokemonPages: uris.filter((uri): boolean => !isPokemonPage(uri)),
    duplicatePages: [...new Set(uris.filter((uri, position): boolean => uris.indexOf(uri) !== position))],
  };
  const passed =
    report.itemCount.actual === expectedCount &&
    ![report.mismatches, report.missingPages, report.nonPokemonPages, report.duplicatePages].some(
      (problems): boolean => Boolean(problems.length),
    );

  return { passed, ...report };
}
