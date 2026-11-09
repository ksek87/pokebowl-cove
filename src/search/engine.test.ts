import { expect, it } from 'vitest';
import { toEngineConfiguration } from './engine.ts';
import { SEARCH_HUB } from './settings.ts';

it('uses the Coveo values and the search hub enforced by the browser key', (): void => {
  const configuration = toEngineConfiguration({
    organizationId: 'test-org',
    searchApiKey: 'test-key',
  });

  expect(configuration).toEqual({
    organizationId: 'test-org',
    accessToken: 'test-key',
    search: { searchHub: SEARCH_HUB },
    preprocessRequest: expect.any(Function),
  });
});
