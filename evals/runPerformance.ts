import { chromium, type Page } from '@playwright/test';
import { readCoveoConfig, type CoveoConfig } from '../src/config.ts';
import { PAGE_SIZES, POKEMON_FIELDS, SORT_OPTIONS } from '../src/search/settings.ts';
import { querySuggest, timedSearch, type SearchOptions } from './coveoQueries.ts';
import { latencyStats, proposeTarget, type LatencyStats } from './metrics.ts';
import type { RelevanceQuery } from './relevance.ts';
import { pause, readEvalJson, runMain, writeEvalJson } from './runner.ts';

/** Sequential and paced on purpose: Coveo requires load tests to be authorized. */
const PACING_MS = 500;
const SEARCH_SAMPLES = 40;
const VARIANT_SAMPLES = 15;
const SUGGEST_SAMPLES = 40;
const PAGE_LOADS = 15;
const PAGE_LOAD_PACING_MS = 2000;
const PREFIX_LENGTH = 3;
const HEADROOM = 1.2;
const ROUND_TO_MS = 50;
const PAGE_TIMEOUT_MS = 30_000;
const PREVIEW_URL = process.env.PERF_URL ?? 'http://localhost:4199/';

async function sample<T>(items: T[], measure: (item: T) => Promise<number>, pacing: number): Promise<LatencyStats> {
  const durations: number[] = [];
  for (const item of items) {
    durations.push(await measure(item));
    await pause(pacing);
  }
  return latencyStats(durations);
}

function take(queries: string[], size: number): string[] {
  const step = Math.max(queries.length / size, 1);
  return Array.from({ length: Math.min(size, queries.length) }, (_unused, slot): string => queries[Math.floor(slot * step)]);
}

function repeat(size: number): number[] {
  return Array.from({ length: size }, (_unused, slot): number => slot);
}

async function searchVariants(config: CoveoConfig, words: string[]): Promise<Record<string, LatencyStats>> {
  const timed = async (options: SearchOptions): Promise<number> => (await timedSearch(config, options)).ms;
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

interface PageTimes {
  firstContentfulPaint: number;
  loadEvent: number;
  firstResult: number;
}

async function measurePage(page: Page): Promise<PageTimes> {
  const started = Date.now();
  await page.goto(PREVIEW_URL, { waitUntil: 'load', timeout: PAGE_TIMEOUT_MS });
  await page.locator('atomic-result').first().waitFor({ timeout: PAGE_TIMEOUT_MS });
  const firstResult = Date.now() - started;
  return page.evaluate((visible): PageTimes => {
    const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const paint = performance.getEntriesByName('first-contentful-paint')[0];
    return { firstContentfulPaint: paint?.startTime ?? 0, loadEvent: navigation.loadEventEnd, firstResult: visible };
  }, firstResult);
}

/** Loads the built app in a real browser. Analytics are blocked and search capture is turned off. */
async function pageLoads(): Promise<Record<keyof PageTimes, LatencyStats>> {
  const browser = await chromium.launch();
  const times: PageTimes[] = [];
  for (let attempt = 0; attempt < PAGE_LOADS; attempt += 1) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.route(/pokemondb\.net|analytics|\/events\//, (route) => route.abort());
    await page.route('**/rest/search/v2?*', async (route) => {
      const body = JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>;
      await route.continue({ postData: JSON.stringify({ ...body, analytics: { capture: false } }) });
    });
    times.push(await measurePage(page));
    await context.close();
    await pause(PAGE_LOAD_PACING_MS);
  }
  await browser.close();
  const read = (key: keyof PageTimes): LatencyStats => latencyStats(times.map((entry): number => entry[key]));
  return { firstContentfulPaint: read('firstContentfulPaint'), loadEvent: read('loadEvent'), firstResult: read('firstResult') };
}

function targetFor(stats: LatencyStats | null): number | null {
  return stats ? proposeTarget(stats.p95, HEADROOM, ROUND_TO_MS) : null;
}

async function main(): Promise<void> {
  const config = readCoveoConfig(process.env);
  const queries = await readEvalJson<RelevanceQuery[]>('reference/relevance-queries.json');
  const words = take(queries.map((entry): string => entry.query), SEARCH_SAMPLES);
  const prefixes = take(queries.filter((entry): boolean => entry.category === 'name').map((entry): string => entry.query.slice(0, PREFIX_LENGTH)), SUGGEST_SAMPLES);
  const search = await sample(words, async (q) => (await timedSearch(config, { q })).ms, PACING_MS);
  const typeAhead = await sample(prefixes, async (q) => (await querySuggest(config, q)).ms, PACING_MS);
  const variants = await searchVariants(config, words);
  const page = await pageLoads();
  const answers = await readEvalJson<{ firstTextMs: LatencyStats | null; totalMs: LatencyStats | null }>('reports/answers.json').catch(() => ({ firstTextMs: null, totalMs: null }));

  await writeEvalJson('reports/performance.json', {
    measuredAt: new Date().toISOString(),
    context: `One local network, sequential paced requests, ${POKEMON_FIELDS.name} and other display fields, maximumAge 0 for API timings, production build served locally. Images from pokemondb.net were blocked. Hosted numbers will differ.`,
    search,
    typeAhead,
    variants,
    answer: answers,
    page,
    proposedTargetsMs: {
      search: targetFor(search),
      typeAhead: targetFor(typeAhead),
      answerFirstText: targetFor(answers.firstTextMs),
      answerTotal: targetFor(answers.totalMs),
      firstResult: targetFor(page.firstResult),
    },
  });
  console.log('Wrote evals/reports/performance.json');
}

runMain(main);
