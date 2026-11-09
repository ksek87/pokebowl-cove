import { describe, expect, it } from 'vitest';
import { NAME_PREFIX_BOOST } from '../src/search/settings.ts';
import {
  BARE_TYPE_CATEGORY,
  BENCHMARK_SETTINGS,
  SHORT_PREFIX_CATEGORY,
  buildBenchmarkQueries,
  changedTopResults,
  needsOneRequest,
  scoreRow,
  summarizeSetting,
  type BenchmarkRow,
} from './prefixBenchmark.ts';
import type { RelevanceQuery } from './relevance.ts';

const K = 2;
const HALF = 0.5;
const FAST_MS = 10;
const SLOW_MS = 30;

const FIRE = ['Charmander', 'Charmeleon', 'Charizard', 'Vulpix'];
const TYPE_QUERIES: RelevanceQuery[] = [
  { query: 'fire type', category: 'type', relevant: FIRE },
  { query: 'water type', category: 'type', relevant: ['Squirtle', 'Wartortle', 'Chartest'] },
  { query: 'Charizard', category: 'name', relevant: ['Charizard'] },
];

describe('buildBenchmarkQueries', (): void => {
  const queries = buildBenchmarkQueries(TYPE_QUERIES);
  const inCategory = (category: string): RelevanceQuery[] => queries.filter((entry): boolean => entry.category === category);

  it('asks for each Type by its bare name with the same relevant set', (): void => {
    expect(inCategory(BARE_TYPE_CATEGORY)).toEqual([
      { query: 'fire', category: BARE_TYPE_CATEGORY, relevant: FIRE },
      { query: 'water', category: BARE_TYPE_CATEGORY, relevant: TYPE_QUERIES[1].relevant },
    ]);
  });

  it('keeps three-letter prefixes shared by at least three names', (): void => {
    const [prefix, ...others] = inCategory(SHORT_PREFIX_CATEGORY);

    expect(others).toEqual([]);
    expect(prefix.query).toBe('cha');
    expect([...prefix.relevant].sort()).toEqual(['Charizard', 'Charmander', 'Charmeleon', 'Chartest']);
  });
});

describe('BENCHMARK_SETTINGS', (): void => {
  const find = (label: string) => BENCHMARK_SETTINGS.find((setting): boolean => setting.label === label);

  it('compares today, no boost and the shipped boost', (): void => {
    expect(find('today')).toBeDefined();
    expect(find('no-boost')).toBeDefined();
    expect(find(`boost-${NAME_PREFIX_BOOST}`)).toBeDefined();
  });

  it('leaves the request unchanged for today', (): void => {
    const body = { q: 'char' };

    expect(find('today')?.rewrite(body)).toBe(body);
  });

  it('uses the application rewrite for the boosts', (): void => {
    expect(find(`boost-${NAME_PREFIX_BOOST}`)?.rewrite({ q: 'char' }).aq).toContain(`modifier:'${NAME_PREFIX_BOOST}'`);
    expect(find('no-boost')?.rewrite({ q: 'char' })).not.toHaveProperty('aq');
  });
});

describe('needsOneRequest', (): void => {
  it('is true only when the rewrite does not touch the query', (): void => {
    expect(needsOneRequest('fire dragon')).toBe(true);
    expect(needsOneRequest('char')).toBe(false);
  });
});

describe('scoring', (): void => {
  const query = (category: string, relevant: string[]): RelevanceQuery => ({ query: 'q', category, relevant });
  const row = (category: string, relevant: string[], ranked: string[], ms: number | null): BenchmarkRow =>
    scoreRow(query(category, relevant), ranked, { ms, k: K });

  it('adds name-first and precision to the query score', (): void => {
    expect(row('partial', ['a', 'b'], ['a', 'x'], FAST_MS)).toMatchObject({ namesFirst: 0, precision: HALF, ms: FAST_MS, reciprocalRank: 1 });
  });

  it('reports each measure from its category and times only rewritten queries', (): void => {
    const rows = [
      row('name', ['a'], ['x', 'a'], null),
      row('partial', ['a', 'b'], ['a', 'b'], FAST_MS),
      row(SHORT_PREFIX_CATEGORY, ['a', 'b'], ['a', 'x'], SLOW_MS),
      row(BARE_TYPE_CATEGORY, ['a', 'b'], ['a', 'x'], SLOW_MS),
    ];

    const summary = summarizeSetting(rows, K);

    expect(summary.overall).toMatchObject({ queries: 2, mrr: (HALF + 1) / 2 });
    expect(summary.partialNamesFirst).toBe(1);
    expect(summary.shortPrefixNamesFirst).toBe(0);
    expect(summary.bareTypePrecision).toBe(HALF);
    expect(summary.latency).toMatchObject({ count: 3, p95: SLOW_MS });
    expect(summary.byCategory.name).toMatchObject({ queries: 1 });
  });

  it('lists bare Types whose top results changed', (): void => {
    const before = [row(BARE_TYPE_CATEGORY, ['a'], ['a', 'b'], FAST_MS), row('partial', ['a'], ['a', 'b'], FAST_MS)];
    const after = [row(BARE_TYPE_CATEGORY, ['a'], ['b', 'a'], FAST_MS), row('partial', ['a'], ['b', 'a'], FAST_MS)];

    expect(changedTopResults(before, after)).toEqual([{ query: 'q', before: ['a', 'b'], after: ['b', 'a'] }]);
  });
});
