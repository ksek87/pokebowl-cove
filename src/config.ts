export interface CoveoConfig {
  organizationId: string;
  searchApiKey: string;
}

type Env = Record<string, string | undefined>;

const ORGANIZATION_ID = 'VITE_COVEO_ORGANIZATION_ID';
const SEARCH_API_KEY = 'VITE_COVEO_SEARCH_API_KEY';

export function readCoveoConfig(env: Env): CoveoConfig {
  const missing = [ORGANIZATION_ID, SEARCH_API_KEY].filter((name) => !env[name]);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }

  return {
    organizationId: env[ORGANIZATION_ID] as string,
    searchApiKey: env[SEARCH_API_KEY] as string,
  };
}
