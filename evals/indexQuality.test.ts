import { expect, it } from 'vitest';
import { buildIndexReport, isPokemonPage } from './indexQuality.ts';

const URL_BASE = 'https://pokemondb.net/pokedex';
const NAME = 'mr-mime';
const NO_ITEMS = 0;
const ONE_ITEM = 1;
const TWO_ITEMS = 2;
const MOVES_PAGE = 'https://pokemondb.net/move/all';
const reference = {
  [NAME]: {
    name: 'Mr. Mime',
    number: '0122',
    types: ['Psychic', 'Fairy'],
    generation: 'Generation 1',
    image: 'https://img.pokemondb.net/artwork/mr-mime.jpg',
  },
};

function indexed(raw: Record<string, unknown> = {}): { clickUri: string; raw: Record<string, unknown> } {
  return {
    clickUri: `${URL_BASE}/${NAME}`,
    raw: {
      pokemon_name: 'Mr. Mime',
      pokemon_number: '0122',
      pokemon_type: ['Fairy', 'Psychic'],
      pokemon_generation: 'Generation 1',
      pokemon_image: 'https://img.pokemondb.net/artwork/mr-mime.jpg',
      ...raw,
    },
  };
}

it.each(['mr-mime', 'ho-oh', 'porygon2'])('accepts the Pokémon page %s', (name): void => {
  expect(isPokemonPage(`${URL_BASE}/${name}`)).toBe(true);
});

it.each([
  `${URL_BASE}/all`,
  `${URL_BASE}/national`,
  `${URL_BASE}/shiny`,
  `${URL_BASE}/charizard/moves/1`,
  MOVES_PAGE,
  'https://pokemondb.net/type/fire',
])('flags %s as not a Pokémon page', (url): void => {
  expect(isPokemonPage(url)).toBe(false);
});

it('passes when values match, ignoring the order of Types', (): void => {
  const report = buildIndexReport([indexed()], reference, ONE_ITEM);

  expect(report).toMatchObject({ passed: true, mismatches: [], nonPokemonPages: [] });
});

it.each([
  ['types', { pokemon_type: ['Psychic'] }],
  ['generation', { pokemon_generation: 'Generation 2' }],
  ['image', { pokemon_image: 'https://img.pokemondb.net/artwork/other.jpg' }],
])('reports a wrong %s', (field, raw): void => {
  const report = buildIndexReport([indexed(raw)], reference, ONE_ITEM);

  expect(report.passed).toBe(false);
  expect(report.mismatches).toEqual([expect.objectContaining({ page: NAME, field })]);
});

it('reads Types returned as one separated string', (): void => {
  const report = buildIndexReport([indexed({ pokemon_type: 'Psychic;Fairy' })], reference, ONE_ITEM);

  expect(report.mismatches).toEqual([]);
});

it('reports a sampled page missing from the index', (): void => {
  const report = buildIndexReport([], reference, NO_ITEMS);

  expect(report.missingPages).toEqual([NAME]);
  expect(report.passed).toBe(false);
});

it('reports pages that are not Pokémon and a wrong item count', (): void => {
  const report = buildIndexReport([indexed(), { clickUri: MOVES_PAGE, raw: {} }], reference, ONE_ITEM);

  expect(report.nonPokemonPages).toEqual([MOVES_PAGE]);
  expect(report.itemCount).toEqual({ expected: ONE_ITEM, actual: TWO_ITEMS });
  expect(report.passed).toBe(false);
});

it('reports duplicate pages', (): void => {
  const report = buildIndexReport([indexed(), indexed()], reference, TWO_ITEMS);

  expect(report.duplicatePages).toEqual([`${URL_BASE}/${NAME}`]);
});
