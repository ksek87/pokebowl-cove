import { describe, expect, it } from 'vitest';
import { buildRelevanceQueries, scoreQuery, summarizeRelevance, toEvalItem, type EvalItem } from './relevance.ts';

const K = 2;
const QUERY_COUNT = 2;
const HALF = 0.5;

function item(name: string, types: string[], generation: string, abilities: string[], species: string): EvalItem {
  return { name, types, generation, abilities, species };
}

const ITEMS = [
  item('Charmander', ['Fire'], 'Generation 1', ['Blaze'], 'Lizard Pokémon'),
  item('Charizard', ['Fire', 'Flying'], 'Generation 1', ['Blaze', 'Solar Power'], 'Flame Pokémon'),
  item('Pikachu', ['Electric'], 'Generation 1', ['Static'], 'Mouse Pokémon'),
  item('Mr. Mime', ['Psychic', 'Fairy'], 'Generation 2', ['Filter'], 'Barrier Pokémon'),
];

describe('toEvalItem', (): void => {
  it('reads multi-value and single-value fields', (): void => {
    expect(
      toEvalItem({
        clickUri: 'u',
        raw: {
          pokemon_name: 'Pikachu',
          pokemon_type: 'Electric',
          pokemon_generation: 'Generation 1',
          pokemon_abilities: ['Static'],
          pokemon_species: 'Mouse Pokémon',
        },
      }),
    ).toEqual(item('Pikachu', ['Electric'], 'Generation 1', ['Static'], 'Mouse Pokémon'));
  });
});

describe('buildRelevanceQueries', (): void => {
  const queries = buildRelevanceQueries(ITEMS);
  const find = (query: string): unknown => queries.find((entry): boolean => entry.query === query);

  it('expects a name query to find that Pokémon', (): void => {
    expect(find('Charizard')).toMatchObject({ category: 'name', relevant: ['Charizard'] });
  });

  it('derives every Pokémon of a Type', (): void => {
    expect(find('fire type')).toMatchObject({ category: 'type', relevant: ['Charmander', 'Charizard'] });
  });

  it('derives Generations from data', (): void => {
    expect(find('generation 2')).toMatchObject({ category: 'generation', relevant: ['Mr. Mime'] });
  });

  it('derives abilities and species', (): void => {
    expect(find('Blaze')).toMatchObject({ category: 'ability', relevant: ['Charmander', 'Charizard'] });
    expect(find('Flame Pokémon')).toMatchObject({ category: 'species', relevant: ['Charizard'] });
  });

  it('derives partial names from name prefixes', (): void => {
    expect(find('char')).toMatchObject({ category: 'partial', relevant: ['Charmander', 'Charizard'] });
  });

  it('flags hand-written queries as judgment calls', (): void => {
    const descriptive = queries.filter((entry): boolean => entry.category === 'descriptive');
    expect(descriptive.every((entry): boolean => Boolean(entry.judgment))).toBe(true);
  });

  it('never produces a query with nothing relevant', (): void => {
    expect(queries.every((entry): boolean => entry.relevant.length > 0)).toBe(true);
  });
});

describe('scoring', (): void => {
  const query = { query: 'char', category: 'partial', relevant: ['Charizard'] };

  it('scores one query', (): void => {
    expect(scoreQuery(query, ['Magmar', 'Charizard'], [K])).toMatchObject({
      reciprocalRank: HALF,
      recall: { [K]: 1 },
    });
  });

  it('summarizes by category and lists failures', (): void => {
    const hit = scoreQuery({ ...query, category: 'name' }, ['Charizard'], [K]);
    const miss = scoreQuery(query, ['Magmar'], [K]);

    const summary = summarizeRelevance([hit, miss], [K]);

    expect(summary.overall).toMatchObject({ queries: QUERY_COUNT, mrr: HALF, recall: { [K]: HALF } });
    expect(summary.byCategory.partial).toMatchObject({ queries: 1, mrr: 0 });
    expect(summary.failures.map((failure): string => failure.query)).toEqual(['char']);
  });
});
