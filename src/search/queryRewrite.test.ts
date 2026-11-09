import { describe, expect, it, vi } from 'vitest';
import { POKEDEX_SORT_REQUEST, parsePokedexNumber, preprocessSearchRequest, rewriteSearchBody } from './queryRewrite.ts';
import { NAME_PREFIX_BOOST, POKEMON_FIELDS, RELEVANCY_SORT } from './settings.ts';

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

describe('rewriteSearchBody name prefix match', (): void => {
  const prefixMatch = (word: string): string => `@${POKEMON_FIELDS.name}=${word}*`;
  const boost = (word: string): string => `$qre(expression:'${prefixMatch(word)}',modifier:'${NAME_PREFIX_BOOST}')`;

  it('adds the prefix match and boost and keeps the text query', (): void => {
    expect(rewriteSearchBody({ q: 'char', sortCriteria: RELEVANCY_SORT })).toEqual({
      q: 'char',
      sortCriteria: RELEVANCY_SORT,
      wildcards: true,
      dq: prefixMatch('char'),
      aq: boost('char'),
    });
  });

  it('keeps an existing advanced expression alongside the boost', (): void => {
    expect(rewriteSearchBody({ q: 'char', aq: '@other==Fire' }).aq).toBe(`(@other==Fire) ${boost('char')}`);
  });

  it('uses the trimmed word in expressions and leaves the text query as typed', (): void => {
    expect(rewriteSearchBody({ q: '  char ' })).toMatchObject({ q: '  char ', dq: prefixMatch('char') });
  });

  it.each(['Flabébé', 'ニャース', 'porygon2', 'p2'])('accepts %s', (word): void => {
    expect(rewriteSearchBody({ q: word }).dq).toBe(prefixMatch(word));
  });

  it('can include prefix matches without a boost', (): void => {
    const rewritten = rewriteSearchBody({ q: 'char' }, null);

    expect(rewritten.dq).toBe(prefixMatch('char'));
    expect(rewritten).not.toHaveProperty('aq');
  });

  it.each([
    'c',
    'fire dragon',
    'char"',
    "char'",
    'char*',
    '@char',
    'char(',
    'char)',
    'mr. mime',
    'ho-oh',
    'a=b',
    '$qre',
  ])('leaves %j alone', (query): void => {
    const body = { q: query, sortCriteria: RELEVANCY_SORT };

    expect(rewriteSearchBody(body)).toBe(body);
  });

  describe('active filters', (): void => {
    const TYPE = POKEMON_FIELDS.type;
    const GENERATION = POKEMON_FIELDS.generation;
    const selected = (value: string): { value: string; state: string } => ({ value, state: 'selected' });
    const excluded = (value: string): { value: string; state: string } => ({ value, state: 'excluded' });
    const idle = (value: string): { value: string; state: string } => ({ value, state: 'idle' });
    const specific = (field: string, currentValues: object[]): { field: string; type: string; resultsMustMatch: string; currentValues: object[] } => ({
      field,
      type: 'specific',
      resultsMustMatch: 'atLeastOneValue',
      currentValues,
    });
    const dqFor = (body: object): string | undefined => rewriteSearchBody({ q: 'char', ...body }).dq;

    it('ignores facets with no active value', (): void => {
      expect(dqFor({ facets: [specific(TYPE, [idle('Fire')]), specific(GENERATION, [])] })).toBe(prefixMatch('char'));
    });

    it('adds a selected value', (): void => {
      expect(dqFor({ facets: [specific(TYPE, [idle('Bug'), selected('Fire')])] })).toBe(
        `${prefixMatch('char')} @${TYPE}==("Fire")`,
      );
    });

    it('allows any selected value of one facet', (): void => {
      expect(dqFor({ facets: [specific(TYPE, [selected('Fire'), selected('Bug')])] })).toBe(
        `${prefixMatch('char')} @${TYPE}==("Fire","Bug")`,
      );
    });

    it('requires every facet with an active value', (): void => {
      expect(dqFor({ facets: [specific(TYPE, [selected('Fire')]), specific(GENERATION, [selected('Generation 1')])] })).toBe(
        `${prefixMatch('char')} @${TYPE}==("Fire") @${GENERATION}==("Generation 1")`,
      );
    });

    it('removes excluded values', (): void => {
      expect(dqFor({ facets: [specific(TYPE, [selected('Fire'), excluded('Bug'), excluded('Ice')])] })).toBe(
        `${prefixMatch('char')} @${TYPE}==("Fire") NOT @${TYPE}==("Bug","Ice")`,
      );
    });

    it('keeps non-ASCII values and spaces inside quotes', (): void => {
      expect(dqFor({ facets: [specific(TYPE, [selected('Électrik ♀'), selected("Farfetch'd")])] })).toBe(
        `${prefixMatch('char')} @${TYPE}==("Électrik ♀","Farfetch'd")`,
      );
    });

    it('applies an existing advanced expression to the added names', (): void => {
      expect(dqFor({ aq: '@other==Fire' })).toBe(`${prefixMatch('char')} (@other==Fire)`);
    });

    it('keeps the boost in the advanced expression only', (): void => {
      const rewritten = rewriteSearchBody({ q: 'char', facets: [specific(TYPE, [selected('Fire')])] });

      expect(rewritten.aq).toBe(boost('char'));
    });

    it.each([
      ['a value with a double quote', { facets: [specific(TYPE, [selected('Fi"re')])] }],
      ['a value with a backslash', { facets: [specific(TYPE, [selected('Fi\\re')])] }],
      ['an empty value', { facets: [specific(TYPE, [selected('')])] }],
      ['an unsafe field name', { facets: [specific('type") OR @x==("', [selected('Fire')])] }],
      ['an unknown value state', { facets: [specific(TYPE, [{ value: 'Fire', state: 'autoSelected' }])] }],
      ['every-value matching', { facets: [{ ...specific(TYPE, [selected('Fire')]), resultsMustMatch: 'allValues' }] }],
      ['a numeric range', { facets: [{ field: TYPE, type: 'numericalRange', currentValues: [{ start: 1, end: 2, state: 'selected' }] }] }],
      ['a selected hierarchical child', {
        facets: [{ field: TYPE, type: 'hierarchical', currentValues: [{ value: 'a', state: 'idle', children: [selected('b')] }] }],
      }],
      ['an active automatic facet', { automaticFacets: { currentFacets: [{ field: TYPE, currentValues: [selected('Fire')] }] } }],
    ])('omits the inclusion for %s and keeps the boost', (_name, body): void => {
      const rewritten = rewriteSearchBody({ q: 'char', ...body });

      expect(rewritten).not.toHaveProperty('dq');
      expect(rewritten).toMatchObject({ q: 'char', wildcards: true, aq: boost('char') });
    });

    it('ignores non-specific facets with no active value', (): void => {
      expect(dqFor({ facets: [{ field: TYPE, type: 'numericalRange', currentValues: [{ start: 1, end: 2, state: 'idle' }] }] })).toBe(
        prefixMatch('char'),
      );
    });
  });

  it('keeps a number lookup free of the prefix match', (): void => {
    const rewritten = rewriteSearchBody({ q: '25' });

    expect(rewritten).toMatchObject({ q: '', aq: `@${POKEMON_FIELDS.number}=="0025"` });
    expect(rewritten).not.toHaveProperty('dq');
    expect(rewritten).not.toHaveProperty('wildcards');
  });

  it('keeps the home page free of the prefix match', (): void => {
    expect(rewriteSearchBody({ q: '', sortCriteria: RELEVANCY_SORT })).not.toHaveProperty('dq');
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
