import { buildCriterionExpression, parseCriterionExpression } from '@coveo/headless';
import { PAGE_SIZES, SORT_OPTIONS } from './settings.ts';

const OFFERED_SORTS = SORT_OPTIONS.map(({ expression }): string =>
  buildCriterionExpression(parseCriterionExpression(expression)),
);
const OFFERED_PAGE_SIZES = PAGE_SIZES.map(String);

function decoded(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function isSupported(entry: string): boolean {
  const [key, value = ''] = entry.split('=');
  if (key === 'sortCriteria') {
    return OFFERED_SORTS.includes(decoded(value) ?? '');
  }
  return key !== 'numberOfResults' || OFFERED_PAGE_SIZES.includes(value);
}

/**
 * Removes sort and page size values the interface does not offer. Atomic restores
 * URL state as written, and a sort Coveo rejects leaves no control to change it.
 */
export function withoutUnsupportedUrlState(hash: string): string {
  if (!hash) {
    return hash;
  }
  const kept = hash.slice('#'.length).split('&').filter(isSupported);
  return kept.length ? `#${kept.join('&')}` : '';
}
