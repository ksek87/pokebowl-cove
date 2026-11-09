import { readCoveoConfig, type CoveoConfig } from '../src/config.ts';
import { DEFAULT_PAGE_SIZE, NAME_PREFIX_BOOST, POKEMON_FIELDS } from '../src/search/settings.ts';
import { timedSearch } from './coveoQueries.ts';
import {
  BENCHMARK_SETTINGS,
  buildBenchmarkQueries,
  changedTopResults,
  needsOneRequest,
  scoreRow,
  summarizeSetting,
  type BenchmarkRow,
  type BenchmarkSetting,
} from './prefixBenchmark.ts';
import type { RelevanceQuery } from './relevance.ts';
import { pause, readEvalJson, runMain, writeEvalJson } from './runner.ts';

const PACING_MS = 100;
const BASELINE_POSITION = 0;
const BASELINE = BENCHMARK_SETTINGS[BASELINE_POSITION];
const SHIPPED_LABEL = `boost-${NAME_PREFIX_BOOST}`;

async function search(config: CoveoConfig, query: string, setting: BenchmarkSetting): Promise<{ ranked: string[]; ms: number }> {
  const { response, ms } = await timedSearch(config, { q: query }, { rewrite: setting.rewrite });
  await pause(PACING_MS);
  return { ranked: response.results.map((result): string => String(result.raw[POKEMON_FIELDS.name])), ms };
}

async function runQuery(config: CoveoConfig, query: RelevanceQuery): Promise<BenchmarkRow[]> {
  if (needsOneRequest(query.query)) {
    const { ranked } = await search(config, query.query, BASELINE);
    return BENCHMARK_SETTINGS.map((): BenchmarkRow => scoreRow(query, ranked, { ms: null, k: DEFAULT_PAGE_SIZE }));
  }
  const rows: BenchmarkRow[] = [];
  for (const setting of BENCHMARK_SETTINGS) {
    const { ranked, ms } = await search(config, query.query, setting);
    rows.push(scoreRow(query, ranked, { ms, k: DEFAULT_PAGE_SIZE }));
  }
  return rows;
}

async function main(): Promise<void> {
  const config = readCoveoConfig(process.env);
  const original = await readEvalJson<RelevanceQuery[]>('reference/relevance-queries.json');
  const queries = [...original, ...buildBenchmarkQueries(original)];
  const perQuery: BenchmarkRow[][] = [];
  for (const query of queries) {
    perQuery.push(await runQuery(config, query));
  }
  const rowsFor = (position: number): BenchmarkRow[] => perQuery.map((rows): BenchmarkRow => rows[position]);
  const baseline = rowsFor(BASELINE_POSITION);
  const summary = BENCHMARK_SETTINGS.map(({ label }, position) => ({
    label,
    ...summarizeSetting(rowsFor(position), DEFAULT_PAGE_SIZE),
    bareTypesChangedInTopResults: changedTopResults(baseline, rowsFor(position)),
  }));
  const shipped = BENCHMARK_SETTINGS.findIndex(({ label }): boolean => label === SHIPPED_LABEL);
  await writeEvalJson('reports/prefix-benchmark.json', {
    measuredAt: new Date().toISOString(),
    method: 'Each setting runs in pokebowl-search with analytics capture off, sequentially and paced. Boost settings use the application rewrite with a different modifier. Queries the rewrite leaves alone are sent once and are not timed. Overall covers the reference queries only. Latency is from a developer machine, not a hosted site.',
    k: DEFAULT_PAGE_SIZE,
    queries: queries.length,
    timedQueries: perQuery.filter((rows): boolean => rows[BASELINE_POSITION].ms !== null).length,
    shippedSetting: SHIPPED_LABEL,
    summary,
    rows: { today: baseline, [SHIPPED_LABEL]: rowsFor(shipped) },
  });
  console.log(JSON.stringify(summary.map(({ label, overall, partialNamesFirst, shortPrefixNamesFirst, bareTypePrecision, latency, byCategory, bareTypesChangedInTopResults }) => ({
    label,
    overallMrr: overall.mrr,
    partialMrr: byCategory.partial.mrr,
    partialNamesFirst,
    shortPrefixNamesFirst,
    shortPrefixRecall: byCategory['short-prefix'].recall[DEFAULT_PAGE_SIZE],
    bareTypePrecision,
    p95: latency.p95,
    bareTypesChanged: bareTypesChangedInTopResults.map((change): string => change.query),
  }))));
}

runMain(main);
