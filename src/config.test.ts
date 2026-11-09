// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import viteConfig from '../vite.config.ts';
import { readCoveoConfig } from './config.ts';

vi.mock('vite', async (importActual) => ({
  ...(await importActual<object>()),
  loadEnv: (): object => ({}),
}));

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

describe('production build', (): void => {
  it('fails when a Coveo value is missing', (): void => {
    expect((): unknown => viteConfig({ command: 'build', mode: 'production' })).toThrow(/VITE_COVEO/);
  });

  it('does not require the values for the development server', (): void => {
    expect((): unknown => viteConfig({ command: 'serve', mode: 'development' })).not.toThrow();
  });
});
