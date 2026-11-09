import type { CoveoConfig } from '../src/config.ts';
import { DEFAULT_PAGE_SIZE, FACET_VALUE_LIMIT, POKEMON_FIELDS, RELEVANCY_SORT, SEARCH_HUB } from '../src/search/settings.ts';

const LOCALE = 'en';
const SUGGESTION_COUNT = 8;
const DATA_PREFIX = 'data:';
const ANSWER_FORMATS = ['text/markdown', 'text/plain'];

/** Every eval request skips analytics, so eval traffic cannot train a model. */
const NO_ANALYTICS = { capture: false };

export interface SearchOptions {
  q: string;
  aq?: string;
  sortCriteria?: string;
  numberOfResults?: number;
  generative?: boolean;
}

interface SearchResponse {
  results: { clickUri: string; raw: Record<string, unknown> }[];
  duration?: number;
  searchAPIDuration?: number;
  indexDuration?: number;
  extendedResults?: { generativeQuestionAnsweringId?: string };
}

export interface TimedSearch {
  ms: number;
  serverMs: number | null;
  response: SearchResponse;
}

export interface AnswerStreamResult {
  text: string;
  citations: string[];
  answerGenerated: boolean;
  firstTextMs: number | null;
  totalMs: number;
}

type Clock = () => number;
const now: Clock = (): number => performance.now();

interface Dependencies {
  api?: typeof fetch;
  clock?: Clock;
}

export type SearchRequestBody = Record<string, unknown> & { q: string; aq?: string; sortCriteria?: string };

export interface TimedSearchDependencies extends Dependencies {
  /** Applied to the request body, so an eval can run the same rewrite as the application. */
  rewrite?: (body: SearchRequestBody) => SearchRequestBody;
}

function endpoint(config: CoveoConfig, path: string): string {
  return `https://${config.organizationId}.org.coveo.com/rest/${path}`;
}

function headers(config: CoveoConfig): Record<string, string> {
  return { authorization: `Bearer ${config.searchApiKey}`, 'content-type': 'application/json' };
}

function facet(field: string): object {
  return { facetId: field, field, type: 'specific', numberOfValues: FACET_VALUE_LIMIT, sortCriteria: 'alphanumeric', currentValues: [] };
}

/** Mirrors what the page sends, including facets, so timings reflect real requests. */
export function buildSearchBody(options: SearchOptions): SearchRequestBody {
  const { q, aq, sortCriteria = RELEVANCY_SORT, numberOfResults = DEFAULT_PAGE_SIZE, generative = false } = options;
  return {
    q,
    ...(aq && { aq }),
    sortCriteria,
    numberOfResults,
    searchHub: SEARCH_HUB,
    locale: LOCALE,
    fieldsToInclude: Object.values(POKEMON_FIELDS),
    facets: [facet(POKEMON_FIELDS.type), facet(POKEMON_FIELDS.generation)],
    analytics: NO_ANALYTICS,
    maximumAge: 0,
    ...(generative && {
      pipelineRuleParameters: {
        mlGenerativeQuestionAnswering: {
          responseFormat: { contentFormat: ANSWER_FORMATS },
          citationsFieldToInclude: [],
        },
      },
    }),
  };
}

export async function timedSearch(
  config: CoveoConfig,
  options: SearchOptions,
  { api = fetch, clock = now, rewrite = (body): SearchRequestBody => body }: TimedSearchDependencies = {},
): Promise<TimedSearch> {
  const started = clock();
  const response = await api(endpoint(config, 'search/v2'), {
    method: 'POST',
    headers: headers(config),
    body: JSON.stringify(rewrite(buildSearchBody(options))),
  });
  if (!response.ok) {
    throw new Error(`The Search API returned ${response.status}.`);
  }
  const body = (await response.json()) as SearchResponse;
  return { ms: clock() - started, serverMs: body.duration ?? null, response: body };
}

export async function querySuggest(
  config: CoveoConfig,
  q: string,
  { api = fetch, clock = now }: Dependencies = {},
): Promise<{ ms: number; completions: string[] }> {
  const started = clock();
  const response = await api(endpoint(config, 'search/v2/querySuggest'), {
    method: 'POST',
    headers: headers(config),
    body: JSON.stringify({ q, count: SUGGESTION_COUNT, locale: LOCALE, searchHub: SEARCH_HUB, analytics: NO_ANALYTICS }),
  });
  if (!response.ok) {
    throw new Error(`The Query Suggest API returned ${response.status}.`);
  }
  const body = (await response.json()) as { completions: { expression: string }[] };
  return { ms: clock() - started, completions: body.completions.map((entry): string => entry.expression) };
}

interface StreamState {
  text: string;
  citations: string[];
  answerGenerated: boolean;
  firstTextAt: number | null;
}

interface StreamPayload {
  textDelta?: string;
  citations?: { clickUri?: string; uri?: string }[];
  answerGenerated?: boolean;
}

const PAYLOAD_HANDLERS: Record<string, (data: StreamPayload, state: StreamState, clock: Clock) => void> = {
  'genqa.messageType': ({ textDelta }, state, clock): void => {
    if (textDelta) {
      state.firstTextAt ??= clock();
      state.text += textDelta;
    }
  },
  'genqa.citationsType': ({ citations = [] }, state): void => {
    state.citations = citations.map((citation): string => citation.clickUri ?? citation.uri ?? '');
  },
  'genqa.endOfStreamType': ({ answerGenerated }, state): void => {
    state.answerGenerated = Boolean(answerGenerated);
  },
};

function applyEvent(line: string, state: StreamState, clock: Clock): void {
  const { payloadType, payload } = JSON.parse(line.slice(DATA_PREFIX.length)) as { payloadType?: string; payload?: string };
  if (payloadType && payload) {
    PAYLOAD_HANDLERS[payloadType]?.(JSON.parse(payload) as StreamPayload, state, clock);
  }
}

/** Reads the answer stream; times are measured from `startedAt`, the moment the search was sent. */
export async function readAnswerStream(
  config: CoveoConfig,
  { streamId, startedAt }: { streamId: string; startedAt: number },
  { api = fetch, clock = now }: Dependencies = {},
): Promise<AnswerStreamResult> {
  const url = endpoint(config, `organizations/${config.organizationId}/machinelearning/streaming/${streamId}`);
  const response = await api(url, { headers: { ...headers(config), accept: 'text/event-stream' } });
  if (!response.ok || !response.body) {
    throw new Error(`The answer stream returned ${response.status}.`);
  }
  const state: StreamState = { text: '', citations: [], answerGenerated: false, firstTextAt: null };
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    lines.filter((line): boolean => line.startsWith(DATA_PREFIX)).forEach((line): void => applyEvent(line, state, clock));
  }
  return {
    text: state.text,
    citations: state.citations,
    answerGenerated: state.answerGenerated,
    firstTextMs: state.firstTextAt === null ? null : state.firstTextAt - startedAt,
    totalMs: clock() - startedAt,
  };
}

/** Answers are throttled at 2 queries per second, so evals stay far below that, one at a time. */
export const ANSWER_PACING_MS = 3000;

const NO_ANSWER = { text: '', citations: [], answerGenerated: false, firstTextMs: null };

/** Sends a search that asks for an answer, then reads the stream. Times run from sending the search. */
export async function timedAnswer(
  config: CoveoConfig,
  options: Omit<SearchOptions, 'generative'>,
  dependencies: TimedSearchDependencies = {},
): Promise<AnswerStreamResult> {
  const clock = dependencies.clock ?? now;
  const startedAt = clock();
  const { response } = await timedSearch(config, { ...options, generative: true }, dependencies);
  const streamId = response.extendedResults?.generativeQuestionAnsweringId;
  if (!streamId) {
    return { ...NO_ANSWER, totalMs: clock() - startedAt };
  }
  return readAnswerStream(config, { streamId, startedAt }, dependencies);
}
