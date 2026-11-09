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
