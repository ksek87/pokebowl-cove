import { expect, it, vi } from 'vitest';
import { POKEMON_FIELDS } from '../src/search/settings.ts';
import { rewriteSearchBody } from '../src/search/queryRewrite.ts';
import { buildSearchBody } from './coveoQueries.ts';
import { hostedTargets, shippedAnswer, shippedSearch, summarizeHostedRuns, type HostedRun } from './performance.ts';

const CONFIG = { organizationId: 'org', searchApiKey: 'key' };
const PARTIAL_NAME = 'char';
const FIRST_CALL = 0;
const MEASURED_LCP_MS = 1000;
const HEADROOM = 1.2;
const NO_SHIFT = 0;

function sentBody(api: ReturnType<typeof vi.fn>): Record<string, unknown> {
  const [, init] = api.mock.calls[FIRST_CALL] as [string, RequestInit];
  return JSON.parse(String(init.body)) as Record<string, unknown>;
}

function emptyResults(): ReturnType<typeof vi.fn> {
  return vi.fn(async (): Promise<Response> => new Response(JSON.stringify({ results: [] })));
}

it('sends a partial name the way the application does', async (): Promise<void> => {
  const api = emptyResults();

  await shippedSearch(CONFIG, { q: PARTIAL_NAME }, { api: api as typeof fetch });

  expect(sentBody(api)).toEqual(rewriteSearchBody(buildSearchBody({ q: PARTIAL_NAME })));
  expect(sentBody(api)).toMatchObject({ wildcards: true, dq: expect.stringContaining(`@${POKEMON_FIELDS.name}=${PARTIAL_NAME}*`) });
});

it('sends a Pokédex number the way the application does', async (): Promise<void> => {
  const api = emptyResults();

  await shippedSearch(CONFIG, { q: '25' }, { api: api as typeof fetch });

  expect(sentBody(api)).toMatchObject({ q: '', aq: expect.stringContaining(POKEMON_FIELDS.number) });
});

it('keeps analytics capture off after the rewrite', async (): Promise<void> => {
  const api = emptyResults();

  await shippedSearch(CONFIG, { q: PARTIAL_NAME }, { api: api as typeof fetch });

  expect(sentBody(api)).toMatchObject({ analytics: { capture: false } });
});

it('applies the rewrite to the search behind a generated answer', async (): Promise<void> => {
  const api = emptyResults();

  await shippedAnswer(CONFIG, { q: PARTIAL_NAME }, { api: api as typeof fetch });

  expect(sentBody(api)).toMatchObject({ wildcards: true });
});

function run(values: Partial<HostedRun>): HostedRun {
  return {
    firstContentfulPaint: 1,
    load: 2,
    largestContentfulPaint: 3,
    cumulativeLayoutShift: 0.01,
    firstResult: 4,
    searchRequest: 6,
    typeAheadRequest: 7,
    answerFirstText: null,
    answerComplete: null,
    ...values,
  };
}

it('summarizes each measure and skips runs without an answer', (): void => {
  const summary = summarizeHostedRuns([run({ firstResult: 10, answerFirstText: 100, answerComplete: 200 }), run({ firstResult: 30 })]);

  expect(summary.firstResult).toMatchObject({ count: 2, p50: 10, p95: 30 });
  expect(summary.answerFirstText).toMatchObject({ count: 1, p50: 100 });
});

it('has no answer summary when no run asked a question', (): void => {
  expect(summarizeHostedRuns([run({})]).answerComplete).toBeNull();
});

it('derives a timing target from the p95 with headroom', (): void => {
  const targets = hostedTargets(summarizeHostedRuns([run({ largestContentfulPaint: MEASURED_LCP_MS })]));

  expect(targets.largestContentfulPaint).toBe(MEASURED_LCP_MS * HEADROOM);
});

it('never sets a layout shift target of zero', (): void => {
  const targets = hostedTargets(summarizeHostedRuns([run({ cumulativeLayoutShift: NO_SHIFT })]));

  expect(targets.cumulativeLayoutShift).toBeGreaterThan(NO_SHIFT);
});
