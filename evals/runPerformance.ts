import { readCoveoConfig, type CoveoConfig } from '../src/config.ts';
import { PAGE_SIZES, SORT_OPTIONS } from '../src/search/settings.ts';
import type { AnswerCase } from './answerEvals.ts';
import { ANSWER_PACING_MS, querySuggest, type SearchOptions } from './coveoQueries.ts';
import { VIEWPORT, measureHostedRuns } from './hostedPage.ts';
import { latencyStats, type LatencyStats } from './metrics.ts';
import { hostedTargets, shippedAnswer, shippedSearch, summarizeHostedRuns, timingTarget } from './performance.ts';
import type { RelevanceQuery } from './relevance.ts';
import { pause, readEvalJson, runMain, writeEvalJson } from './runner.ts';

/** Sequential and paced on purpose: Coveo requires load tests to be authorized. */
const PACING_MS = 500;
const SEARCH_SAMPLES = 40;
const VARIANT_SAMPLES = 15;
const SUGGEST_SAMPLES = 40;
/** Enough answers for a p95 that is not simply the slowest one, while using little of the generative allowance. */
const ANSWER_SAMPLES = 20;
const HOSTED_RUNS = 10;
const HOSTED_ANSWER_RUNS = 5;
const HOSTED_PACING_MS = 2000;
const PREFIX_LENGTH = 3;
const NO_ANSWER_EXPECTED = 'unanswerable';
const FACT = 'fact';
const HOSTED_URL = process.env.PERF_URL ?? 'https://pokebowl-cove.vercel.app/';

async function sample<T>(items: T[], measure: (item: T) => Promise<number>, pacing: number): Promise<LatencyStats> {
  const durations: number[] = [];
  for (const item of items) {
    durations.push(await measure(item));
    await pause(pacing);
  }
  return latencyStats(durations);
}

function take<T>(items: T[], size: number): T[] {
  const step = Math.max(items.length / size, 1);
  return Array.from({ length: Math.min(size, items.length) }, (_unused, slot): T => items[Math.floor(slot * step)]);
}

function repeat(size: number): number[] {
  return Array.from({ length: size }, (_unused, slot): number => slot);
}

async function searchVariants(config: CoveoConfig, words: string[]): Promise<Record<string, LatencyStats>> {
  const timed = async (options: SearchOptions): Promise<number> => (await shippedSearch(config, options)).ms;
  const largest = Math.max(...PAGE_SIZES);
  const [, pokedex, name] = SORT_OPTIONS.map((option): string =>
    option.expression.includes(' ') ? `@${option.expression}` : option.expression,
  );
  const variants: Record<string, (position: number) => SearchOptions> = {
    relevance: (position) => ({ q: words[position % words.length] }),
    sortedByPokedexNumber: (position) => ({ q: words[position % words.length], sortCriteria: pokedex }),
    sortedByName: (position) => ({ q: words[position % words.length], sortCriteria: name }),
    smallestPageHome: () => ({ q: '', sortCriteria: pokedex }),
    largestPageHome: () => ({ q: '', sortCriteria: pokedex, numberOfResults: largest }),
  };
  const stats: Record<string, LatencyStats> = {};
  for (const [label, build] of Object.entries(variants)) {
    stats[label] = await sample(repeat(VARIANT_SAMPLES), (position) => timed(build(position)), PACING_MS);
  }
  return stats;
}

async function answers(config: CoveoConfig, cases: AnswerCase[]): Promise<{ firstText: LatencyStats; complete: LatencyStats; withoutAnswer: number }> {
  const firstText: number[] = [];
  const complete: number[] = [];
  for (const testCase of cases) {
    const outcome = await shippedAnswer(config, { q: testCase.question, aq: testCase.scope });
    if (outcome.firstTextMs !== null) {
      firstText.push(outcome.firstTextMs);
      complete.push(outcome.totalMs);
    }
    await pause(ANSWER_PACING_MS);
  }
  return { firstText: latencyStats(firstText), complete: latencyStats(complete), withoutAnswer: cases.length - firstText.length };
}

async function main(): Promise<void> {
  const config = readCoveoConfig(process.env);
  const queries = await readEvalJson<RelevanceQuery[]>('reference/relevance-queries.json');
  const questions = await readEvalJson<AnswerCase[]>('reference/answer-questions.json');
  const words = take(queries.map((entry): string => entry.query), SEARCH_SAMPLES);
  const namePrefixes = queries.filter((entry): boolean => entry.category === 'name').map((entry): string => entry.query.slice(0, PREFIX_LENGTH));
  const prefixes = take(namePrefixes, SUGGEST_SAMPLES);
  const search = await sample(words, async (q) => (await shippedSearch(config, { q })).ms, PACING_MS);
  const typeAhead = await sample(prefixes, async (q) => (await querySuggest(config, q)).ms, PACING_MS);
  const variants = await searchVariants(config, words);
  const answerable = questions.filter((entry): boolean => entry.category !== NO_ANSWER_EXPECTED);
  const answer = await answers(config, take(answerable, ANSWER_SAMPLES));
  const facts = questions.filter((entry): boolean => entry.category === FACT).map((entry): string => entry.question);
  const hosted = await measureHostedRuns(HOSTED_URL, {
    prefixes: take(namePrefixes, HOSTED_RUNS),
    questions: take(facts, HOSTED_ANSWER_RUNS),
    pacingMs: HOSTED_PACING_MS,
  });
  const page = summarizeHostedRuns(hosted.runs);

  await writeEvalJson('reports/performance.json', {
    measuredAt: new Date().toISOString(),
    context: `Measured from one developer machine on a home network, not from users. API timings are sent from Node straight to Coveo with the same request bodies as the application, including the partial-name and Pokédex number rewrite, maximumAge 0 and analytics capture off. Requests are sequential and paced. Page timings load ${HOSTED_URL} in headless Chromium with no CPU or network throttling, a cold cache and a ${VIEWPORT.width}×${VIEWPORT.height} window. Each run then types one partial name and, in the first ${HOSTED_ANSWER_RUNS} runs, asks one question. Artwork from pokemondb.net is fetched once and served from memory for every card, to respect its crawl rate, so artwork download time is not included. Playwright answers CORS preflight requests itself when it intercepts a request, so browser request timings do not include a preflight.`,
    search,
    typeAhead,
    variants,
    answer,
    hosted: { url: HOSTED_URL, ...page, sentSearches: hosted.sent },
    proposedTargets: {
      method: 'Each target is the measured p95 plus 20%, rounded up to the next 50 ms. Layout shift is rounded up to two decimals and is never below 0.01.',
      searchMs: timingTarget(search),
      typeAheadMs: timingTarget(typeAhead),
      answerFirstTextMs: timingTarget(answer.firstText),
      answerCompleteMs: timingTarget(answer.complete),
      hosted: hostedTargets(page),
    },
  });
  console.log('Wrote evals/reports/performance.json');
}

runMain(main);
