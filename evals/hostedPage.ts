import { chromium, type BrowserContext, type Page, type Request, type Route } from '@playwright/test';
import type { HostedRun } from './performance.ts';
import { pause } from './runner.ts';

export const VIEWPORT = { width: 1440, height: 900 };
const PAGE_TIMEOUT_MS = 30_000;
const ANSWER_TIMEOUT_MS = 60_000;
const SETTLE_TIMEOUT_MS = 10_000;
const STEP_PACING_MS = 500;
const TYPING_DELAY_MS = 80;

const ARTWORK = /img\.pokemondb\.net/;
const POKEMONDB = /pokemondb\.net/;
const ANALYTICS = /analytics|\/events\//;
const SEARCH = /\/rest\/search\/v2\?/;
const SUGGEST = /\/rest\/search\/v2\/querySuggest\?/;
const SEARCH_OR_SUGGEST = /\/rest\/search\/v2(\/querySuggest)?\?/;
const STREAM = /\/machinelearning\/streaming\//;
const SEARCH_BOX = 'atomic-search-box textarea:not([part="textarea-spacer"])';
const ANSWER_TEXT = 'atomic-generated-answer [part~="generated-text"]';
const ANY_TEXT = /\S/;
const NO_SEARCHES = 0;
const ONE_SEARCH = 1;

/** What the hosted page actually sent, so the report can show the shipped rewrite was applied. */
export interface SentSearches {
  /** Every one was sent with analytics capture off. */
  total: number;
  partialNameRewritten: number;
}

interface Vitals {
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
}

declare global {
  interface Window {
    pokebowlVitals?: Vitals;
  }
}

/** Runs in the page before any script, so it sees every paint and layout shift from the start. */
function observeVitals(): void {
  const vitals: Vitals = { largestContentfulPaint: 0, cumulativeLayoutShift: 0 };
  window.pokebowlVitals = vitals;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      vitals.largestContentfulPaint = entry.startTime;
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
      if (!entry.hadRecentInput) {
        vitals.cumulativeLayoutShift += entry.value;
      }
    }
  }).observe({ type: 'layout-shift', buffered: true });
}

function sentBody(request: Request): Record<string, unknown> {
  return JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
}

/**
 * pokemondb.net asks crawlers to wait 2 seconds between requests. A page load asks for every
 * card's artwork at once, so one real artwork is fetched once and served for every card.
 * Cards still load a real image of a real size, but no artwork time from pokemondb.net is included.
 */
function artworkFromOneFetch(): (route: Route) => Promise<void> {
  // The bytes are kept, not the response: a fetched response is disposed with the context that made it.
  let artwork: Promise<{ status: number; headers: Record<string, string>; body: Buffer }> | undefined;
  return async (route) => {
    artwork ??= route.fetch().then(async (response) => ({ status: response.status(), headers: response.headers(), body: await response.body() }));
    await route.fulfill(await artwork);
  };
}

interface ContextSetup {
  sent: SentSearches;
  artwork: (route: Route) => Promise<void>;
  answers: { allowed: boolean };
}

async function prepareContext(context: BrowserContext, { sent, artwork, answers }: ContextSetup): Promise<void> {
  await context.route(POKEMONDB, (route) => (ARTWORK.test(route.request().url()) ? artwork(route) : route.abort()));
  await context.route(ANALYTICS, (route) => route.abort());
  await context.route(STREAM, (route) => (answers.allowed ? route.continue() : route.abort()));
  await context.route(SEARCH_OR_SUGGEST, async (route) => {
    const body: Record<string, unknown> = { ...sentBody(route.request()), analytics: { capture: false } };
    sent.total += ONE_SEARCH;
    sent.partialNameRewritten += Number(body.wildcards === true && typeof body.dq === 'string');
    await route.continue({ postData: JSON.stringify(body) });
  });
  await context.addInitScript(observeVitals);
}

/** Browser-measured duration of the latest request whose URL matches. */
function lastDuration(page: Page, pattern: RegExp): Promise<number> {
  return page.evaluate((source) => {
    const matcher = new RegExp(source);
    const entries = performance.getEntriesByType('resource').filter((entry) => matcher.test(entry.name));
    return entries.pop()?.duration ?? Number.NaN;
  }, pattern.source);
}

async function loadPage(page: Page, url: string): Promise<Omit<HostedRun, 'searchRequest' | 'typeAheadRequest' | 'answerFirstText' | 'answerComplete'>> {
  const started = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout: PAGE_TIMEOUT_MS });
  await page.locator('atomic-result').first().waitFor({ timeout: PAGE_TIMEOUT_MS });
  const firstResult = Date.now() - started;
  await page.waitForLoadState('networkidle', { timeout: SETTLE_TIMEOUT_MS }).catch(() => undefined);
  return page.evaluate((visible) => {
    const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const [paint] = performance.getEntriesByName('first-contentful-paint');
    const vitals = window.pokebowlVitals;
    return {
      firstContentfulPaint: paint?.startTime ?? Number.NaN,
      load: navigation.loadEventEnd,
      largestContentfulPaint: vitals?.largestContentfulPaint ?? Number.NaN,
      cumulativeLayoutShift: vitals?.cumulativeLayoutShift ?? Number.NaN,
      firstResult: visible,
    };
  }, firstResult);
}

async function typeAndSearch(page: Page, text: string): Promise<void> {
  const box = page.locator(SEARCH_BOX);
  await box.fill('');
  const suggested = page.waitForResponse((response) => SUGGEST.test(response.url()) && sentBody(response.request()).q === text);
  await box.pressSequentially(text, { delay: TYPING_DELAY_MS });
  await suggested;
  const searched = page.waitForResponse((response) => SEARCH.test(response.url()) && sentBody(response.request()).q === text);
  await box.press('Enter');
  await searched;
}

async function askQuestion(page: Page, question: string, answers: { allowed: boolean }): Promise<{ firstText: number; complete: number }> {
  answers.allowed = true;
  const box = page.locator(SEARCH_BOX);
  await box.fill(question);
  const streamed = page.waitForResponse((response) => STREAM.test(response.url()), { timeout: ANSWER_TIMEOUT_MS });
  const sentAt = await page.evaluate(() => performance.now());
  await box.press('Enter');
  await page.locator(ANSWER_TEXT).filter({ hasText: ANY_TEXT }).first().waitFor({ timeout: ANSWER_TIMEOUT_MS });
  const firstText = (await page.evaluate(() => performance.now())) - sentAt;
  await (await streamed).finished();
  const complete = await page.evaluate(
    ({ source, start }) => {
      const matcher = new RegExp(source);
      const entry = performance.getEntriesByType('resource').filter((item) => matcher.test(item.name)).pop() as PerformanceResourceTiming | undefined;
      return entry ? entry.responseEnd - start : Number.NaN;
    },
    { source: STREAM.source, start: sentAt },
  );
  return { firstText, complete };
}

/**
 * Cold loads of the hosted site in a fresh browser context each time, one after another.
 * Each run then types one partial name, and the first runs ask one question.
 */
export async function measureHostedRuns(
  url: string,
  { prefixes, questions, pacingMs }: { prefixes: string[]; questions: string[]; pacingMs: number },
): Promise<{ runs: HostedRun[]; sent: SentSearches }> {
  const browser = await chromium.launch();
  const artwork = artworkFromOneFetch();
  const sent: SentSearches = { total: NO_SEARCHES, partialNameRewritten: NO_SEARCHES };
  const runs: HostedRun[] = [];
  try {
    for (const [position, prefix] of prefixes.entries()) {
      const context = await browser.newContext({ viewport: VIEWPORT });
      const answers = { allowed: false };
      await prepareContext(context, { sent, artwork, answers });
      const page = await context.newPage();
      const loaded = await loadPage(page, url);
      await typeAndSearch(page, prefix);
      const typeAheadRequest = await lastDuration(page, SUGGEST);
      const searchRequest = await lastDuration(page, SEARCH);
      const question = questions.at(position);
      await pause(STEP_PACING_MS);
      // A missing answer is recorded as no answer, so one slow stream does not discard the other runs.
      const answer = question ? await askQuestion(page, question, answers).catch((): null => null) : null;
      runs.push({
        ...loaded,
        typeAheadRequest,
        searchRequest,
        answerFirstText: answer?.firstText ?? null,
        answerComplete: answer?.complete ?? null,
      });
      await context.close();
      await pause(pacingMs);
    }
  } finally {
    await browser.close();
  }
  return { runs, sent };
}
