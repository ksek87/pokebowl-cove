import { expect, it } from 'vitest';
import { DEFAULT_PAGE_SIZE, POKEDEX_SORT, RELEVANCY_SORT } from './settings.ts';
import { withoutUnsupportedUrlState } from './urlState.ts';

const OFFERED_SORT = `sortCriteria=${encodeURIComponent(`@${POKEDEX_SORT}`)}`;
const PAGE_SIZE_OFFSET = 1;
const UNOFFERED_PAGE_SIZE = DEFAULT_PAGE_SIZE + PAGE_SIZE_OFFSET;

it.each([
  '',
  '#q=charizard',
  `#${OFFERED_SORT}`,
  `#sortCriteria=${RELEVANCY_SORT}`,
  `#numberOfResults=${DEFAULT_PAGE_SIZE}`,
  `#q=fire&${OFFERED_SORT}&f-pokemon_type=Fire,Water`,
])('keeps %s unchanged', (hash): void => {
  expect(withoutUnsupportedUrlState(hash)).toBe(hash);
});

it.each([
  ['a doubled field marker', OFFERED_SORT.replace('%40', '%40%40')],
  ['an unknown field', 'sortCriteria=%40nope%20ascending'],
  ['undecodable text', 'sortCriteria=%E0%A4%A'],
])('removes a sort with %s', (_name, entry): void => {
  expect(withoutUnsupportedUrlState(`#q=fire&${entry}`)).toBe('#q=fire');
});

it('removes a page size that is not offered', (): void => {
  expect(withoutUnsupportedUrlState(`#q=fire&numberOfResults=${UNOFFERED_PAGE_SIZE}`)).toBe('#q=fire');
});

it('leaves no empty hash behind', (): void => {
  expect(withoutUnsupportedUrlState('#sortCriteria=%40nope%20ascending')).toBe('');
});
