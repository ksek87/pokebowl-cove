import { buildCriterionExpression, parseCriterionExpression } from '@coveo/headless';
import { expect, it } from 'vitest';
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, RESULT_COLUMNS, SORT_OPTIONS } from './settings.ts';

it.each(PAGE_SIZES)('fills every row at a page size of %i', (size): void => {
  expect(size % RESULT_COLUMNS.narrow).toBeFalsy();
  expect(size % RESULT_COLUMNS.wide).toBeFalsy();
});

it('starts on an offered page size', (): void => {
  expect(PAGE_SIZES).toContain(DEFAULT_PAGE_SIZE);
});

it.each(SORT_OPTIONS)('Headless can build a valid request from the $label sort', ({ expression }): void => {
  const request = buildCriterionExpression(parseCriterionExpression(expression));

  expect(request).not.toContain('@@');
  expect(request).toBe(expression.includes(' ') ? `@${expression}` : expression);
});

it('uses the smallest page size that fills rows at both column counts', (): void => {
  const smaller = Array.from({ length: DEFAULT_PAGE_SIZE - 1 }, (_, index) => index + 1);

  expect(smaller.filter((size) => !(size % RESULT_COLUMNS.narrow) && !(size % RESULT_COLUMNS.wide))).toEqual([]);
});

it('starts on the least common multiple of the two column counts', (): void => {
  const { narrow, wide } = RESULT_COLUMNS;
  let multiple = wide;
  while (multiple % narrow) {
    multiple += wide;
  }

  expect(DEFAULT_PAGE_SIZE).toBe(multiple);
});
