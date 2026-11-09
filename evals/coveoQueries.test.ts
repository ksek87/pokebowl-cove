import { expect, it, vi } from 'vitest';
import { SEARCH_HUB } from '../src/search/settings.ts';
import { buildSearchBody, querySuggest, readAnswerStream, timedSearch } from './coveoQueries.ts';

const CONFIG = { organizationId: 'org', searchApiKey: 'key' };
const START = 0;
const SPLIT_AT = 10;

function clockFrom(...ticks: number[]): () => number {
  let index = 0;
  return (): number => ticks[Math.min(index++, ticks.length - 1)];
}

function event(payloadType: string, payload: object): string {
  return `data: ${JSON.stringify({ payloadType, payload: JSON.stringify(payload) })}\n\n`;
}

function streamOf(...chunks: string[]): Response {
  return new Response(
    new ReadableStream({
      start(controller): void {
        chunks.forEach((chunk): void => controller.enqueue(new TextEncoder().encode(chunk)));
        controller.close();
      },
    }),
  );
}

it('keeps every search out of analytics and routes it by hub', (): void => {
  expect(buildSearchBody({ q: 'fire' })).toMatchObject({
    q: 'fire',
    searchHub: SEARCH_HUB,
    analytics: { capture: false },
  });
});

it('asks for a generated answer only when requested', (): void => {
  expect(buildSearchBody({ q: 'fire' })).not.toHaveProperty('pipelineRuleParameters');
  expect(buildSearchBody({ q: 'fire', generative: true })).toHaveProperty(
    'pipelineRuleParameters.mlGenerativeQuestionAnswering',
  );
});

it('passes a scope as an advanced query', (): void => {
  expect(buildSearchBody({ q: 'x', aq: '@a==b' })).toMatchObject({ aq: '@a==b' });
});

it('times a search and reports server durations', async (): Promise<void> => {
  const api = vi.fn(async (): Promise<Response> => new Response(JSON.stringify({ results: [], duration: 7 })));

  const result = await timedSearch(CONFIG, { q: 'fire' }, { api: api as typeof fetch, clock: clockFrom(100, 150) });

  expect(result).toMatchObject({ ms: 50, serverMs: 7 });
});

it('fails loudly on a Search API error', async (): Promise<void> => {
  const api = vi.fn(async (): Promise<Response> => new Response('{}', { status: 400 }));

  await expect(timedSearch(CONFIG, { q: 'x' }, { api: api as typeof fetch })).rejects.toThrow('400');
});

it('times query suggestions without analytics', async (): Promise<void> => {
  const api = vi.fn(async (_url: unknown, _init?: RequestInit): Promise<Response> =>
    new Response(JSON.stringify({ completions: [{ expression: 'a' }] })),
  );

  const result = await querySuggest(CONFIG, 'ch', { api: api as typeof fetch, clock: clockFrom(0, 20) });

  expect(result).toMatchObject({ ms: 20, completions: ['a'] });
  expect(JSON.parse(String(api.mock.calls[0]?.[1]?.body))).toMatchObject({ analytics: { capture: false } });
});

it('reads text, citations and timing from an answer stream split across chunks', async (): Promise<void> => {
  const whole = event('genqa.messageType', { textDelta: 'Fire ' }) + event('genqa.messageType', { textDelta: 'type' });
  const api = vi.fn(async (): Promise<Response> =>
    streamOf(
      event('genqa.headerMessageType', {}),
      whole.slice(0, SPLIT_AT),
      whole.slice(SPLIT_AT),
      event('genqa.citationsType', { citations: [{ clickUri: 'u1' }] }),
      event('genqa.endOfStreamType', { answerGenerated: true }),
    ),
  );

  const result = await readAnswerStream(CONFIG, { streamId: 'id', startedAt: START }, { api: api as typeof fetch, clock: clockFrom(40, 90) });

  expect(result).toMatchObject({
    text: 'Fire type',
    citations: ['u1'],
    answerGenerated: true,
    firstTextMs: 40,
    totalMs: 90,
  });
});

it('reports no answer when the stream says so', async (): Promise<void> => {
  const api = vi.fn(async (): Promise<Response> => streamOf(event('genqa.endOfStreamType', { answerGenerated: false })));

  const result = await readAnswerStream(CONFIG, { streamId: 'id', startedAt: START }, { api: api as typeof fetch, clock: clockFrom(5) });

  expect(result).toMatchObject({ text: '', answerGenerated: false, firstTextMs: null });
});
