import { describe, expect, it } from 'vitest';
import { parsePokedexNumber, rewriteSearchBody } from './queryRewrite.ts';
import { POKEDEX_SORT } from './settings.ts';

describe('parsePokedexNumber', (): void => {
  it.each([
    ['3', '0003'],
    ['25', '0025'],
    ['#25', '0025'],
    ['0025', '0025'],
    ['1025', '1025'],
  ])('reads %s as Pokédex number %s', (query, expected): void => {
    expect(parsePokedexNumber(query)).toBe(expected);
  });

  it.each(['', 'pikachu', 'generation 3', '25 pikachu', '12345', '3.5'])(
    'does not treat %j as a Pokédex number',
    (query): void => {
      expect(parsePokedexNumber(query)).toBeNull();
    },
  );
});

describe('rewriteSearchBody', (): void => {
  it('turns a number-only query into an exact Pokédex lookup', (): void => {
    expect(rewriteSearchBody({ q: '3', sortCriteria: 'relevancy' })).toEqual({
      q: '',
      aq: '@pokemon_number=="0003"',
      sortCriteria: 'relevancy',
    });
  });

  it('keeps an existing advanced expression alongside the lookup', (): void => {
    expect(rewriteSearchBody({ q: '3', aq: '@pokemon_type==Fire' }).aq).toBe(
      '(@pokemon_type==Fire) @pokemon_number=="0003"',
    );
  });

  it('shows the home page in Pokédex order', (): void => {
    expect(rewriteSearchBody({ q: '', sortCriteria: 'relevancy' }).sortCriteria).toBe(POKEDEX_SORT);
  });

  it('respects a sort the person chose on the home page', (): void => {
    expect(rewriteSearchBody({ q: '', sortCriteria: '@pokemon_name ascending' }).sortCriteria).toBe(
      '@pokemon_name ascending',
    );
  });

  it('leaves a text search alone', (): void => {
    const body = { q: 'fire dragon', sortCriteria: 'relevancy' };

    expect(rewriteSearchBody(body)).toEqual(body);
  });
});
