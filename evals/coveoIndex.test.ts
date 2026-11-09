import { expect, it, type Mock, vi } from 'vitest';
import { fetchIndexedItems } from './coveoIndex.ts';

const CONFIG = { organizationId: 'org', searchApiKey: 'key' };
const PAGE_SIZE = 2;
const FIRST_PAGE = [
  { clickUri: 'a', raw: {} },
  { clickUri: 'b', raw: {} },
];
const LAST_PAGE = [{ clickUri: 'c', raw: {} }];
const TOTAL = FIRST_PAGE.length + LAST_PAGE.length;
const FORBIDDEN = 403;
const NO_CACHE = 0;

type FetchMock = Mock<typeof fetch>;

function fakeApi(): FetchMock {
  return vi.fn(async (_url: unknown, init?: RequestInit): Promise<Response> => {
    const { firstResult } = JSON.parse(String(init?.body)) as { firstResult: number };
    const results = firstResult ? LAST_PAGE : FIRST_PAGE;
    return new Response(JSON.stringify({ totalCount: TOTAL, results }));
  }) as FetchMock;
}

function bodies(api: FetchMock): Record<string, unknown>[] {
  return api.mock.calls.map(([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>);
}

it('reads every page of results', async (): Promise<void> => {
  const api = fakeApi();

  await expect(fetchIndexedItems(CONFIG, api, PAGE_SIZE)).resolves.toEqual([...FIRST_PAGE, ...LAST_PAGE]);
  expect(api).toHaveBeenCalledTimes(PAGE_SIZE);
});

it('keeps every request out of analytics and away from caches', async (): Promise<void> => {
  const api = fakeApi();

  await fetchIndexedItems(CONFIG, api, PAGE_SIZE);

  for (const body of bodies(api)) {
    expect(body.analytics).toEqual({ capture: false });
    expect(body.maximumAge).toBe(NO_CACHE);
  }
});

it('sends the key only in the authorization header', async (): Promise<void> => {
  const api = fakeApi();

  await fetchIndexedItems(CONFIG, api, PAGE_SIZE);

  const [[url, init]] = api.mock.calls;
  expect(String(url)).not.toContain(CONFIG.searchApiKey);
  expect(new Headers(init?.headers).get('authorization')).toBe(`Bearer ${CONFIG.searchApiKey}`);
});

it('reports a failed request by its status', async (): Promise<void> => {
  const api = vi.fn(async (): Promise<Response> => new Response('nope', { status: FORBIDDEN })) as FetchMock;

  await expect(fetchIndexedItems(CONFIG, api, PAGE_SIZE)).rejects.toThrow(String(FORBIDDEN));
});
