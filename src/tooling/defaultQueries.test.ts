import { describe, expect, it } from 'vitest';
import {
  buildCandidates,
  type Candidate,
  FIELDS,
  isSensibleResult,
  MAX_DEFAULT_QUERIES,
  toCsv,
  toValues,
} from './defaultQueries.ts';

const ONE_EXTRA_QUERY = 1;

const charizard = {
  [FIELDS.name]: 'Charizard',
  [FIELDS.type]: ['Fire', 'Flying'],
  [FIELDS.generation]: 'Generation 1',
  [FIELDS.abilities]: ['Blaze', 'Solar Power'],
  [FIELDS.species]: 'Flame Pokémon',
};

const pecharunt = {
  [FIELDS.name]: 'Pecharunt',
  [FIELDS.type]: 'Poison',
  [FIELDS.generation]: 'Generation 10',
  [FIELDS.abilities]: 'Poison Puppeteer',
  [FIELDS.species]: '???',
};

function queriesIn(category: Candidate['category'], items: Record<string, unknown>[]): string[] {
  return buildCandidates(items)
    .filter((candidate): boolean => candidate.category === category)
    .map((candidate): string => candidate.query);
}

describe('toValues', (): void => {
  it('accepts a list or a single value', (): void => {
    expect(toValues(['Fire', 'Flying'])).toEqual(['Fire', 'Flying']);
    expect(toValues('Water')).toEqual(['Water']);
  });

  it.each([[undefined], [''], ['   '], ['???'], [[' ', '???']]])('drops the empty value %j', (value): void => {
    expect(toValues(value)).toEqual([]);
  });

  it('trims surrounding and repeated spaces', (): void => {
    expect(toValues('  Solar   Power ')).toEqual(['Solar Power']);
  });
});

describe('buildCandidates', (): void => {
  it('uses the Pokémon name as indexed', (): void => {
    expect(queriesIn('name', [charizard])).toEqual(['Charizard']);
  });

  it('words a Type as a person would type it', (): void => {
    expect(queriesIn('type', [charizard])).toEqual(['fire type', 'flying type']);
  });

  it('lowercases a Generation', (): void => {
    expect(queriesIn('generation', [charizard])).toEqual(['generation 1']);
  });

  it('adds a Type pair only for a dual-Type Pokémon', (): void => {
    expect(queriesIn('typePair', [charizard])).toEqual(['fire flying']);
    expect(queriesIn('typePair', [pecharunt])).toEqual([]);
  });

  it('uses abilities and species as indexed', (): void => {
    expect(queriesIn('ability', [charizard])).toEqual(['Blaze', 'Solar Power']);
    expect(queriesIn('species', [charizard])).toEqual(['Flame Pokémon']);
  });

  it('excludes an unknown species', (): void => {
    expect(queriesIn('species', [pecharunt])).toEqual([]);
  });

  it('orders numbers naturally', (): void => {
    expect(queriesIn('generation', [pecharunt, charizard])).toEqual(['generation 1', 'generation 10']);
  });

  it('removes duplicates regardless of case, keeping the earlier category', (): void => {
    const duplicate = { ...charizard, [FIELDS.abilities]: ['charizard'], [FIELDS.species]: 'BLAZE' };

    const queries = buildCandidates([charizard, duplicate]).map((candidate): string => candidate.query.toLowerCase());

    expect(new Set(queries).size).toBe(queries.length);
    expect(queriesIn('name', [charizard, duplicate])).toEqual(['Charizard']);
    expect(queriesIn('ability', [charizard, duplicate])).not.toContain('charizard');
  });
});

describe('isSensibleResult', (): void => {
  function candidateFor(category: Candidate['category']): Candidate {
    const candidate = buildCandidates([charizard]).find((entry): boolean => entry.category === category);
    if (!candidate) {
      throw new Error(`No candidate for ${category}`);
    }
    return candidate;
  }

  it.each(['type', 'generation', 'ability', 'species', 'typePair'] as const)(
    'accepts a result with the %s value',
    (category): void => {
      expect(isSensibleResult(candidateFor(category), charizard)).toBe(true);
    },
  );

  it('ignores case', (): void => {
    expect(isSensibleResult(candidateFor('species'), { [FIELDS.species]: 'flame pokémon' })).toBe(true);
  });

  it('rejects a result without the value', (): void => {
    expect(isSensibleResult(candidateFor('ability'), pecharunt)).toBe(false);
  });

  it('needs both Types for a pair', (): void => {
    expect(isSensibleResult(candidateFor('typePair'), { [FIELDS.type]: ['Fire'] })).toBe(false);
  });
});

describe('toCsv', (): void => {
  it('writes one query per row with no header', (): void => {
    expect(toCsv(['fire type', 'Blaze'])).toBe('fire type\nBlaze\n');
  });

  it('quotes a comma and doubles a quotation mark', (): void => {
    expect(toCsv(['a, b', 'say "hi"'])).toBe('"a, b"\n"say ""hi"""\n');
  });

  it('accepts the maximum number of queries', (): void => {
    expect((): string => toCsv(Array<string>(MAX_DEFAULT_QUERIES).fill('q'))).not.toThrow();
  });

  it('fails above the maximum number of queries', (): void => {
    expect((): string => toCsv(Array<string>(MAX_DEFAULT_QUERIES + ONE_EXTRA_QUERY).fill('q'))).toThrow(/limit/);
  });
});
