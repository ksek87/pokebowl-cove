import { describe, expect, it } from 'vitest';
import { readCoveoConfig } from './config.ts';

describe('readCoveoConfig', (): void => {
  it('returns the Coveo values from the environment', (): void => {
    expect(
      readCoveoConfig({
        VITE_COVEO_ORGANIZATION_ID: 'my-org',
        VITE_COVEO_SEARCH_API_KEY: 'my-key',
      }),
    ).toEqual({ organizationId: 'my-org', searchApiKey: 'my-key' });
  });

  it('names every missing variable', (): void => {
    expect((): unknown => readCoveoConfig({ VITE_COVEO_ORGANIZATION_ID: '' })).toThrow(
      'Missing environment variables: VITE_COVEO_ORGANIZATION_ID, VITE_COVEO_SEARCH_API_KEY',
    );
  });
});
