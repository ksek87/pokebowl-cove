import { describe, expect, it } from 'vitest';
import { readCoveoConfig } from './config';

describe('readCoveoConfig', () => {
  it('returns the Coveo values from the environment', () => {
    expect(
      readCoveoConfig({
        VITE_COVEO_ORGANIZATION_ID: 'my-org',
        VITE_COVEO_SEARCH_API_KEY: 'my-key',
      }),
    ).toEqual({ organizationId: 'my-org', searchApiKey: 'my-key' });
  });

  it('names every missing variable', () => {
    expect(() => readCoveoConfig({ VITE_COVEO_ORGANIZATION_ID: '' })).toThrow(
      'Missing environment variables: VITE_COVEO_ORGANIZATION_ID, VITE_COVEO_SEARCH_API_KEY',
    );
  });
});
