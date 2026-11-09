import { readCoveoConfig } from '../src/config.ts';
import { rewriteSearchBody } from '../src/search/queryRewrite.ts';
import { DEFAULT_PAGE_SIZE, POKEMON_FIELDS } from '../src/search/settings.ts';
import { timedSearch } from './coveoQueries.ts';
import { scoreQuery, summarizeRelevance, type QueryScore, type RelevanceQuery } from './relevance.ts';
import { pause, readEvalJson, runMain, writeEvalJson } from './runner.ts';

const TOP_RESULTS = 3;
const KS = [TOP_RESULTS, DEFAULT_PAGE_SIZE];
const PACING_MS = 500;

async function main(): Promise<void> {
  const config = readCoveoConfig(process.env);
  const queries = await readEvalJson<RelevanceQuery[]>('reference/relevance-queries.json');
  const scores: QueryScore[] = [];
  for (const query of queries) {
    const { response } = await timedSearch(config, { q: query.query }, { rewrite: rewriteSearchBody });
    const ranked = response.results.map((result): string => String(result.raw[POKEMON_FIELDS.name]));
    scores.push(scoreQuery(query, ranked, KS));
    await pause(PACING_MS);
  }
  const summary = summarizeRelevance(scores, KS);
  await writeEvalJson('reports/relevance.json', {
    measuredAt: new Date().toISOString(),
    method: 'Recall@K counts hits out of the relevant items that can fit in K. Queries run in pokebowl-search with analytics capture off, through the same request rewrite as the application.',
    ks: KS,
    ...summary,
    scores,
  });
  console.log(JSON.stringify({ overall: summary.overall, byCategory: summary.byCategory, failures: summary.failures.length }, null, 1));
}

runMain(main);
