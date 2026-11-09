import { buildSearchParameterSerializer, type Result } from '@coveo/headless';
import { describe, expect, it } from 'vitest';
import {
  exactNameExpression,
  facetSearchHref,
  findRequestedPokemon,
  pokemonDetailHref,
  pokemonNameFromUrl,
  toPokemonDetail, sourceLinkLabel, askPokemonQuestion } from './pokemonDetail.ts';
import {
  POKEMON_DETAIL_ONLY_FIELDS,
  POKEMON_DETAIL_PARAM,
  POKEMON_FIELDS,
  POKEMON_STATS,
  UNKNOWN_POKEDEX_NUMBER,
} from './settings.ts';

const SOURCE = 'https://example.test/source';
const NAME_WITH_SYMBOLS = 'Mr. Mime & Co #1';

function pokemon(raw: Record<string, unknown>): Result {
  return { clickUri: SOURCE, raw: { [POKEMON_FIELDS.name]: 'Charizard', ...raw } } as unknown as Result;
}

describe('detail URL', (): void => {
  it('round-trips a name with spaces and symbols', (): void => {
    const href = pokemonDetailHref(NAME_WITH_SYMBOLS);

    expect(pokemonNameFromUrl(href.slice(href.indexOf('?')))).toBe(NAME_WITH_SYMBOLS);
  });

  it.each(['', `?${POKEMON_DETAIL_PARAM}=`, `?${POKEMON_DETAIL_PARAM}=%20`, '?other=1'])(
    'treats %j as the search page',
    (search): void => {
      expect(pokemonNameFromUrl(search)).toBeNull();
    },
  );
});

describe('exactNameExpression', (): void => {
  it('matches the name field exactly', (): void => {
    expect(exactNameExpression('Mr. Mime')).toBe(`@${POKEMON_FIELDS.name}=="Mr. Mime"`);
  });

  it('cannot be broken out of with a quote', (): void => {
    expect(exactNameExpression('a" OR @x=="y')).toBe(`@${POKEMON_FIELDS.name}=="a OR @x==y"`);
  });
});

describe('findRequestedPokemon', (): void => {
  it('accepts any letter case', (): void => {
    expect(findRequestedPokemon([pokemon({})], 'charizard')).toBeDefined();
  });

  it('rejects a result with another name, as a wildcard search can return', (): void => {
    expect(findRequestedPokemon([pokemon({})], '?????????')).toBeUndefined();
  });
});

describe('toPokemonDetail', (): void => {
  const stats = Object.fromEntries(POKEMON_STATS.map(({ field }, index) => [field, String(index + 1)]));

  it('reads every displayed value', (): void => {
    const detail = toPokemonDetail(
      pokemon({
        [POKEMON_FIELDS.number]: '0006',
        [POKEMON_FIELDS.type]: ['Fire', 'Flying'],
        [POKEMON_DETAIL_ONLY_FIELDS.species]: 'Flame Pokémon',
        [POKEMON_DETAIL_ONLY_FIELDS.abilities]: ['Blaze', 'Solar Power'],
        [POKEMON_DETAIL_ONLY_FIELDS.total]: '534',
        ...stats,
      }),
    );

    expect(detail).toMatchObject({
      name: 'Charizard',
      number: '0006',
      types: ['Fire', 'Flying'],
      species: 'Flame Pokémon',
      abilities: ['Blaze', 'Solar Power'],
      total: '534',
      sourceUrl: SOURCE,
    });
    expect(detail.stats.map(({ label }) => label)).toEqual(POKEMON_STATS.map(({ label }) => label));
    expect(detail.stats[0].value).toBe(1);
  });

  it('has no number when it is not known', (): void => {
    expect(toPokemonDetail(pokemon({ [POKEMON_FIELDS.number]: UNKNOWN_POKEDEX_NUMBER })).number).toBeNull();
  });

  it('has no stats when the Pokémon has none', (): void => {
    expect(toPokemonDetail(pokemon({})).stats).toEqual([]);
  });

  it('ignores a stat that is not a number', (): void => {
    const [{ field }] = POKEMON_STATS;

    expect(toPokemonDetail(pokemon({ [field]: UNKNOWN_POKEDEX_NUMBER })).stats).toEqual([]);
  });
});

it('words the source link around the Pokémon name', (): void => {
  expect(sourceLinkLabel('Mr. Mime')).toBe('Learn more about Mr. Mime');
});

it('links a facet value to the filtered search page', (): void => {
  const href = facetSearchHref(POKEMON_FIELDS.generation, 'Generation 1');

  expect(href.startsWith('/#')).toBe(true);
  expect(buildSearchParameterSerializer().deserialize(href.slice(2)).f).toEqual({
    [POKEMON_FIELDS.generation]: ['Generation 1'],
  });
});

describe('askPokemonQuestion', (): void => {
  it('puts the name in a question', (): void => {
    expect(askPokemonQuestion('Describe {name}', 'Mr. Mime')).toBe('Describe Mr. Mime');
  });
});
