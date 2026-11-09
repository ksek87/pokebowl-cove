import type { SearchEngineConfiguration } from '@coveo/headless';
import type { CoveoConfig } from '../config.ts';
import { preprocessSearchRequest } from './queryRewrite.ts';
import { SEARCH_HUB } from './settings.ts';

export function toEngineConfiguration(config: CoveoConfig): SearchEngineConfiguration {
  return {
    organizationId: config.organizationId,
    accessToken: config.searchApiKey,
    search: { searchHub: SEARCH_HUB },
    preprocessRequest: preprocessSearchRequest,
  };
}
