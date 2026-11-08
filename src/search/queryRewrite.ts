import type { SearchEngineConfiguration } from '@coveo/headless';
import { POKEDEX_NUMBER_FIELD, POKEDEX_NUMBER_WIDTH, POKEDEX_SORT } from './settings.ts';

const POKEDEX_QUERY = /^#?(?<number>\d{1,4})$/;
const DEFAULT_SORT = 'relevancy';

interface SearchBody {
  q?: string;
  aq?: string;
  sortCriteria?: string;
}

/** Returns the zero-padded Pokédex number when a query is only a number. */
export function parsePokedexNumber(query: string): string | null {
  const number = POKEDEX_QUERY.exec(query.trim())?.groups?.number;
  return number ? number.padStart(POKEDEX_NUMBER_WIDTH, '0') : null;
}

export function rewriteSearchBody<T extends SearchBody>(body: T): T {
  const pokedexNumber = parsePokedexNumber(body.q ?? '');
  if (pokedexNumber) {
    const lookup = `@${POKEDEX_NUMBER_FIELD}=="${pokedexNumber}"`;
    return { ...body, q: '', aq: body.aq ? `(${body.aq}) ${lookup}` : lookup };
  }
  if (!body.q && body.sortCriteria === DEFAULT_SORT) {
    return { ...body, sortCriteria: POKEDEX_SORT };
  }
  return body;
}

/**
 * Applies the rewrite to search requests only. A number-only query must clear
 * the text query in the same request, so this cannot use an advanced query action.
 */
export const preprocessSearchRequest: NonNullable<SearchEngineConfiguration['preprocessRequest']> = (
  request,
  clientOrigin,
  metadata,
) => {
  if (metadata?.method !== 'search' || clientOrigin !== 'searchApiFetch') {
    return request;
  }
  try {
    const body = JSON.parse(String(request.body)) as SearchBody;
    return { ...request, body: JSON.stringify(rewriteSearchBody(body)) };
  } catch (error) {
    console.error('Could not rewrite the search request', error);
    return request;
  }
};
