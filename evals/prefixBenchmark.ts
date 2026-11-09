import { rewriteSearchBody, type SearchBody } from '../src/search/queryRewrite.ts';
import { latencyStats, namesFirst, precisionAtK, type LatencyStats } from './metrics.ts';
import { TYPE_QUERY_SUFFIX, scoreQuery, spread, summarizeRelevance, unique, type QueryScore, type RelevanceQuery } from './relevance.ts';

export const BARE_TYPE_CATEGORY = 'bare-type';
export const SHORT_PREFIX_CATEGORY = 'short-prefix';

const ADDED_CATEGORIES = [BARE_TYPE_CATEGORY, SHORT_PREFIX_CATEGORY];
const TYPE_CATEGORY = 'type';
const PARTIAL_CATEGORY = 'partial';
const SHORT_PREFIX_LENGTH = 3;
const MIN_PREFIX_NAMES = 3;
const SHORT_PREFIX_SAMPLE = 30;
const TOP_POSITIONS = 3;
const BOOSTS = [50, 100, 150, 200, 300, 500, 1000];
const LETTERS_ONLY = /^\p{L}+$/u;

type BodyRewrite = <T extends SearchBody>(body: T) => T & SearchBody;

export interface BenchmarkSetting {
  label: string;
  rewrite: BodyRewrite;
}

export interface BenchmarkRow extends QueryScore {
  namesFirst: number;
  precision: number;
  ms: number | null;
}

export const BENCHMARK_SETTINGS: BenchmarkSetting[] = [
  { label: 'today', rewrite: (body) => body },
  { label: 'no-boost', rewrite: (body) => rewriteSearchBody(body, null) },
  ...BOOSTS.map((boost): BenchmarkSetting => ({ label: `boost-${boost}`, rewrite: (body) => rewriteSearchBody(body, boost) })),
];

function bareTypeQueries(typeQueries: RelevanceQuery[]): RelevanceQuery[] {
  return typeQueries.map(({ query, relevant }) => ({
    query: query.replace(TYPE_QUERY_SUFFIX, ''),
    category: BARE_TYPE_CATEGORY,
    relevant,
  }));
}

function shortPrefixQueries(typeQueries: RelevanceQuery[]): RelevanceQuery[] {
  const byPrefix = new Map<string, string[]>();
  for (const name of unique(typeQueries.flatMap((entry): string[] => entry.relevant))) {
    const prefix = name.slice(0, SHORT_PREFIX_LENGTH).toLowerCase();
    if (prefix.length === SHORT_PREFIX_LENGTH && LETTERS_ONLY.test(prefix)) {
      byPrefix.set(prefix, [...(byPrefix.get(prefix) ?? []), name]);
    }
  }
  const candidates = [...byPrefix].filter(([, names]): boolean => names.length >= MIN_PREFIX_NAMES);
  return spread(candidates, SHORT_PREFIX_SAMPLE).map(([query, relevant]) => ({ query, category: SHORT_PREFIX_CATEGORY, relevant }));
}

/** Derives the added categories from the Type queries, so their relevant sets come from the same data. */
export function buildBenchmarkQueries(queries: RelevanceQuery[]): RelevanceQuery[] {
  const typeQueries = queries.filter((entry): boolean => entry.category === TYPE_CATEGORY);
  return [...bareTypeQueries(typeQueries), ...shortPrefixQueries(typeQueries)];
}

/** A query the rewrite leaves alone gets the same results at every setting. */
export function needsOneRequest(query: string): boolean {
  const body = { q: query };
  return rewriteSearchBody(body) === body;
}

export function scoreRow(query: RelevanceQuery, ranked: string[], { ms, k }: { ms: number | null; k: number }): BenchmarkRow {
  return {
    ...scoreQuery(query, ranked, [TOP_POSITIONS, k]),
    namesFirst: namesFirst(ranked, query.relevant, k),
    precision: precisionAtK(ranked, query.relevant, k),
    ms,
  };
}

function meanOf(rows: BenchmarkRow[], category: string, read: (row: BenchmarkRow) => number): number {
  const selected = rows.filter((row): boolean => row.category === category);
  return selected.reduce((sum, row): number => sum + read(row), 0) / selected.length;
}

export function summarizeSetting(rows: BenchmarkRow[], k: number): {
  overall: ReturnType<typeof summarizeRelevance>['overall'];
  byCategory: ReturnType<typeof summarizeRelevance>['byCategory'];
  partialNamesFirst: number;
  shortPrefixNamesFirst: number;
  bareTypePrecision: number;
  latency: LatencyStats;
} {
  const ks = [TOP_POSITIONS, k];
  const original = rows.filter((row): boolean => !ADDED_CATEGORIES.includes(row.category));
  return {
    overall: summarizeRelevance(original, ks).overall,
    byCategory: summarizeRelevance(rows, ks).byCategory,
    partialNamesFirst: meanOf(rows, PARTIAL_CATEGORY, (row): number => row.namesFirst),
    shortPrefixNamesFirst: meanOf(rows, SHORT_PREFIX_CATEGORY, (row): number => row.namesFirst),
    bareTypePrecision: meanOf(rows, BARE_TYPE_CATEGORY, (row): number => row.precision),
    latency: latencyStats(rows.flatMap((row): number[] => (row.ms === null ? [] : [row.ms]))),
  };
}

/** Bare Types are the queries a name boost could harm, so their top results are compared directly. */
export function changedTopResults(
  before: BenchmarkRow[],
  after: BenchmarkRow[],
): { query: string; before: string[]; after: string[] }[] {
  return after.flatMap((row, position) => {
    const earlier = before[position].ranked.slice(0, TOP_POSITIONS);
    const later = row.ranked.slice(0, TOP_POSITIONS);
    return row.category === BARE_TYPE_CATEGORY && earlier.join() !== later.join()
      ? [{ query: row.query, before: earlier, after: later }]
      : [];
  });
}
