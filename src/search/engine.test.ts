import { expect, it } from 'vitest';
import { SEARCH_HUB, toEngineConfiguration } from './engine.ts';

it('uses the Coveo values and the search hub enforced by the browser key', (): void => {
  const configuration = toEngineConfiguration({
    organizationId: 'test-org',
    searchApiKey: 'test-key',
  });

  expect(configuration).toEqual({
    organizationId: 'test-org',
    accessToken: 'test-key',
    search: { searchHub: 'pokebowl-search' },
    preprocessRequest: expect.any(Function),
  });
  expect(SEARCH_HUB).toBe('pokebowl-search');
});
