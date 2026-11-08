import { expect, it } from 'vitest';
import { SEARCH_HUB, toEngineConfiguration } from './engine';

it('uses the Coveo values and the search hub enforced by the browser key', () => {
  const configuration = toEngineConfiguration({
    organizationId: 'test-org',
    searchApiKey: 'test-key',
  });

  expect(configuration).toEqual({
    organizationId: 'test-org',
    accessToken: 'test-key',
    search: { searchHub: 'pokebowl-search' },
  });
  expect(SEARCH_HUB).toBe('pokebowl-search');
});
