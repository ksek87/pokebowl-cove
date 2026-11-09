import {
  buildCriterionExpression,
  parseCriterionExpression,
  type SearchEngineConfiguration,
} from '@coveo/headless';
import { NAME_PREFIX_BOOST, POKEDEX_NUMBER_WIDTH, POKEDEX_SORT, POKEMON_FIELDS, RELEVANCY_SORT } from './settings.ts';

const POKEDEX_QUERY = new RegExp(`^#?(?<number>\\d{1,${POKEDEX_NUMBER_WIDTH}})$`);

// Letters and digits only, so typed text cannot add query syntax to a field expression.
const NAME_PREFIX_WORD = /^[\p{L}\p{N}]{2,}$/u;

const SAFE_FIELD_NAME = /^\w+$/;
// Coveo has no escape for a double quote inside a quoted value: a backslash either fails or still ends the value.
const SAFE_FACET_VALUE = /^[^"\\]+$/;
const SPECIFIC_FACET = 'specific';
const ANY_SELECTED_VALUE = 'atLeastOneValue';
const IDLE = 'idle';
const SELECTED = 'selected';
const EXCLUDED = 'excluded';

export const POKEDEX_SORT_REQUEST = buildCriterionExpression(parseCriterionExpression(POKEDEX_SORT));

interface FacetValueRequest {
  value?: string;
  state?: string;
  children?: FacetValueRequest[];
}

interface FacetRequest {
  field?: string;
  type?: string;
  resultsMustMatch?: string;
  currentValues?: FacetValueRequest[];
}

export interface SearchBody {
  q?: string;
  aq?: string;
  dq?: string;
  wildcards?: boolean;
  sortCriteria?: string;
  facets?: FacetRequest[];
  automaticFacets?: { currentFacets?: FacetRequest[] };
}

/** Returns the zero-padded Pokédex number when a query is only a number. */
export function parsePokedexNumber(query: string): string | null {
  const number = POKEDEX_QUERY.exec(query.trim())?.groups?.number;
  return number ? number.padStart(POKEDEX_NUMBER_WIDTH, '0') : null;
}

function withAdvancedExpression(aq: string | undefined, expression: string): string {
  return aq ? `(${aq}) ${expression}` : expression;
}

function isActive({ state, children = [] }: FacetValueRequest): boolean {
  return (state !== undefined && state !== IDLE) || children.some(isActive);
}

function valueList(field: string, values: FacetValueRequest[]): string {
  return `@${field}==(${values.map(({ value }): string => `"${value}"`).join(',')})`;
}

function hasState(wanted: string): (value: FacetValueRequest) => boolean {
  return ({ state }): boolean => state === wanted;
}

function canExpress(facet: FacetRequest, active: FacetValueRequest[]): boolean {
  const { type, resultsMustMatch = ANY_SELECTED_VALUE, field = '' } = facet;
  return (
    type === SPECIFIC_FACET &&
    resultsMustMatch === ANY_SELECTED_VALUE &&
    SAFE_FIELD_NAME.test(field) &&
    active.every(({ state, value = '' }): boolean => (state === SELECTED || state === EXCLUDED) && SAFE_FACET_VALUE.test(value))
  );
}

/** Returns the facet as a field expression, an empty string when it has no active value, or null when it cannot be expressed safely. */
function facetExpression(facet: FacetRequest): string | null {
  const active = (facet.currentValues ?? []).filter(isActive);
  if (!canExpress(facet, active)) {
    return active.length ? null : '';
  }
  const field = facet.field ?? '';
  const selected = active.filter(hasState(SELECTED));
  const excluded = active.filter(hasState(EXCLUDED));
  return [
    ...(selected.length ? [valueList(field, selected)] : []),
    ...(excluded.length ? [`NOT ${valueList(field, excluded)}`] : []),
  ].join(' ');
}

/**
 * `dq` is an alternative to the group that holds `aq` and facet selections, so a name it
 * includes skips those filters unless `dq` repeats them. Returns null when a filter cannot
 * be repeated safely; leaving out `dq` is better than showing items the filter should remove.
 */
function namePrefixInclusion(body: SearchBody, prefixMatch: string): string | null {
  const facets = [...(body.facets ?? []), ...(body.automaticFacets?.currentFacets ?? [])];
  const expressions = facets.map(facetExpression);
  if (expressions.includes(null)) {
    return null;
  }
  return [prefixMatch, ...expressions.filter(Boolean), ...(body.aq ? [`(${body.aq})`] : [])].join(' ');
}

function rewriteNamePrefix<T extends SearchBody>(body: T, boost: number | null): T & SearchBody {
  const word = body.q?.trim() ?? '';
  if (!NAME_PREFIX_WORD.test(word)) {
    return body;
  }
  const prefixMatch = `@${POKEMON_FIELDS.name}=${word}*`;
  const inclusion = namePrefixInclusion(body, prefixMatch);
  return {
    ...body,
    wildcards: true,
    ...(inclusion !== null && { dq: inclusion }),
    ...(boost !== null && {
      aq: withAdvancedExpression(body.aq, `$qre(expression:'${prefixMatch}',modifier:'${boost}')`),
    }),
  };
}

/** `boost` is a parameter so the benchmark can compare settings; the application uses the default. */
export function rewriteSearchBody<T extends SearchBody>(
  body: T,
  boost: number | null = NAME_PREFIX_BOOST,
): T & SearchBody {
  const pokedexNumber = parsePokedexNumber(body.q ?? '');
  if (pokedexNumber) {
    return { ...body, q: '', aq: withAdvancedExpression(body.aq, `@${POKEMON_FIELDS.number}=="${pokedexNumber}"`) };
  }
  if (!body.q?.trim() && body.sortCriteria === RELEVANCY_SORT) {
    return { ...body, sortCriteria: POKEDEX_SORT_REQUEST };
  }
  return rewriteNamePrefix(body, boost);
}

/**
 * Applies the rewrite to search requests only. A number-only query must clear the text
 * query, and a one-word query needs `dq` and `wildcards` built from the typed text in the
 * same request, so neither can use an advanced query action.
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
