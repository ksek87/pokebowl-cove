import { describe, expect, it, vi } from 'vitest';
import { POKEDEX_SORT_REQUEST, parsePokedexNumber, preprocessSearchRequest, rewriteSearchBody } from './queryRewrite.ts';
import { POKEMON_FIELDS, RELEVANCY_SORT } from './settings.ts';

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
    expect(rewriteSearchBody({ q: '3', sortCriteria: RELEVANCY_SORT })).toEqual({
      q: '',
      aq: `@${POKEMON_FIELDS.number}=="0003"`,
      sortCriteria: RELEVANCY_SORT,
    });
  });

  it('keeps an existing advanced expression alongside the lookup', (): void => {
    expect(rewriteSearchBody({ q: '3', aq: '@other==Fire' }).aq).toBe(
      `(@other==Fire) @${POKEMON_FIELDS.number}=="0003"`,
    );
  });

  it('shows the home page in Pokédex order', (): void => {
    expect(rewriteSearchBody({ q: '', sortCriteria: RELEVANCY_SORT }).sortCriteria).toBe(POKEDEX_SORT_REQUEST);
  });

  it('treats a query of only spaces as the home page', (): void => {
    expect(rewriteSearchBody({ q: '   ', sortCriteria: RELEVANCY_SORT }).sortCriteria).toBe(POKEDEX_SORT_REQUEST);
  });

  it('respects a sort the person chose on the home page', (): void => {
    expect(rewriteSearchBody({ q: '', sortCriteria: '@other ascending' }).sortCriteria).toBe(
      '@other ascending',
    );
  });

  it('leaves a text search alone', (): void => {
    const body = { q: 'fire dragon', sortCriteria: RELEVANCY_SORT };

    expect(rewriteSearchBody(body)).toEqual(body);
  });
});

describe('preprocessSearchRequest', (): void => {
  const lookup = { url: 'https://example.test', body: JSON.stringify({ q: '3' }) };
  const searchMetadata = { method: 'search' } as never;

  function bodyOf(request: { body?: unknown }): { q?: string; aq?: string } {
    return JSON.parse(String(request.body)) as { q?: string; aq?: string };
  }

  it('rewrites a search request', async (): Promise<void> => {
    const request = await preprocessSearchRequest(lookup, 'searchApiFetch', searchMetadata);

    expect(bodyOf(request).aq).toContain(POKEMON_FIELDS.number);
  });

  it.each([
    ['another Search API method', 'searchApiFetch', { method: 'facetSearch' }],
    ['another client', 'analyticsFetch', searchMetadata],
  ])('leaves %s alone', async (_name, origin, metadata): Promise<void> => {
    await expect(Promise.resolve(preprocessSearchRequest(lookup, origin as never, metadata as never))).resolves.toBe(lookup);
  });

  it('sends the original request when the body cannot be read', async (): Promise<void> => {
    const logged = vi.spyOn(console, 'error').mockImplementation((): void => undefined);
    const broken = { url: lookup.url, body: 'not json' };

    await expect(Promise.resolve(preprocessSearchRequest(broken, 'searchApiFetch', searchMetadata))).resolves.toBe(broken);
    logged.mockRestore();
  });
});
