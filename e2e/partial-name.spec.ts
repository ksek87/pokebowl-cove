import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { POKEMON_DETAIL_PARAM, POKEMON_FIELDS } from '../src/search/settings.ts';

const NETWORK_TIMEOUT = 15_000;
const WINDOW_HEIGHT = 900;
const LAPTOP = 1440;
const FULL_HD = 1920;
const WIDTHS = [LAPTOP, FULL_HD];
const PREFIX = 'char';
const PREFIX_NAME = /^char/i;
const FIRST_POSITION = 0;
const ONE_RESULT = 1;
const NAMES_EXPECTED_FIRST = 3;
const FILTER_TYPE = /Fire/;
const NAME_OF_FILTER_TYPE = 'Charizard';
const NAME_OF_OTHER_TYPE = 'Charjabug';
// Found only through the name prefix, so it proves the prefix match still works under a filter.
const ADDED_NAME_OF_FILTER_TYPE = 'Charmander';
const GENERATION = 'Generation 1';
const NAME_OF_OTHER_GENERATION = 'Charcadet';
const RESULT_COUNT = /(?<count>\d+) results?/;
// Matches the text but not the name prefix, so its removal shows the filtered results have arrived.
const TEXT_ONLY_MATCH_OF_OTHER_TYPE = 'Thundurus';
const PIKACHU_NUMBER = '25';

function resultLinks(page: Page): Locator {
  return page.locator(`atomic-result h2 a[href*="${POKEMON_DETAIL_PARAM}="]`);
}

async function shownNames(page: Page): Promise<string[]> {
  const names = await resultLinks(page).evaluateAll((links): string[] =>
    links.map((link): string => link.textContent?.trim() ?? ''),
  );
  return names.filter(Boolean);
}

async function search(page: Page, width: number, filters = ''): Promise<void> {
  await page.setViewportSize({ width, height: WINDOW_HEIGHT });
  await page.goto(`/#q=${PREFIX}${filters}`);
  await expect(page.locator('atomic-query-summary')).toContainText(PREFIX, { timeout: NETWORK_TIMEOUT });
  await expect(page.locator('atomic-result').first()).toBeVisible({ timeout: NETWORK_TIMEOUT });
}

async function screenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: test.info().outputPath(`${name}.png`) });
}

for (const width of WIDTHS) {
  test(`shows names that start with a partial word first at ${width}px`, async ({ page }): Promise<void> => {
    await search(page, width);

    await expect.poll(async () => (await shownNames(page)).length).toBeGreaterThanOrEqual(NAMES_EXPECTED_FIRST);
    const names = await shownNames(page);

    expect(names.slice(FIRST_POSITION, NAMES_EXPECTED_FIRST).every((name): boolean => PREFIX_NAME.test(name))).toBe(true);
    await screenshot(page, `char-${width}`);
  });

  test(`still applies a facet to a partial word at ${width}px`, async ({ page }): Promise<void> => {
    await search(page, width);
    const summary = page.locator('atomic-query-summary');
    const unfiltered = await summary.innerText();
    await expect.poll(async () => shownNames(page)).toContain(NAME_OF_OTHER_TYPE);

    await page
      .locator(`atomic-popover:has(atomic-facet[field="${POKEMON_FIELDS.type}"]) [part~="popover-button"]`)
      .click({ timeout: NETWORK_TIMEOUT });
    await page
      .locator(`atomic-facet[field="${POKEMON_FIELDS.type}"]`)
      .getByRole('checkbox', { name: FILTER_TYPE })
      .click();
    await expect(summary).not.toHaveText(unfiltered, { timeout: NETWORK_TIMEOUT });

    await expect.poll(async () => shownNames(page), { timeout: NETWORK_TIMEOUT }).not.toContain(TEXT_ONLY_MATCH_OF_OTHER_TYPE);
    expect(await shownNames(page)).toContain(NAME_OF_FILTER_TYPE);
    await screenshot(page, `char-facet-${width}`);
    const names = await shownNames(page);
    expect(names).toContain(ADDED_NAME_OF_FILTER_TYPE);
    expect(names).not.toContain(NAME_OF_OTHER_TYPE);
    const fireFacet = page.locator(`atomic-facet[field="${POKEMON_FIELDS.type}"]`).getByRole('checkbox', { name: FILTER_TYPE });
    const facetCount = Number(RESULT_COUNT.exec((await fireFacet.getAttribute('aria-label')) ?? '')?.groups?.count);
    expect(names).toHaveLength(facetCount);
  });

  test(`allows either selected value of one facet at ${width}px`, async ({ page }): Promise<void> => {
    await search(page, width, `&f-${POKEMON_FIELDS.type}=Fire,Bug`);

    await expect.poll(async () => shownNames(page), { timeout: NETWORK_TIMEOUT }).not.toContain(TEXT_ONLY_MATCH_OF_OTHER_TYPE);
    const names = await shownNames(page);
    expect(names).toEqual(expect.arrayContaining([NAME_OF_FILTER_TYPE, NAME_OF_OTHER_TYPE]));
    await screenshot(page, `char-fire-bug-${width}`);
  });

  test(`requires both a Type and a Generation at ${width}px`, async ({ page }): Promise<void> => {
    await search(page, width, `&f-${POKEMON_FIELDS.type}=Fire&f-${POKEMON_FIELDS.generation}=${encodeURIComponent(GENERATION)}`);

    await expect.poll(async () => shownNames(page), { timeout: NETWORK_TIMEOUT }).not.toContain(NAME_OF_OTHER_GENERATION);
    const names = await shownNames(page);
    expect(names).toContain(ADDED_NAME_OF_FILTER_TYPE);
    expect(names).not.toContain(NAME_OF_OTHER_TYPE);
    await screenshot(page, `char-fire-generation-${width}`);
  });

  test(`keeps a number search as a Pokédex lookup at ${width}px`, async ({ page }): Promise<void> => {
    await page.setViewportSize({ width, height: WINDOW_HEIGHT });
    await page.goto(`/#q=${PIKACHU_NUMBER}`);

    await expect(page.locator('atomic-result')).toHaveCount(ONE_RESULT, { timeout: NETWORK_TIMEOUT });
    await expect(page.locator('atomic-result').getByRole('link').first()).toContainText('Pikachu');
    await screenshot(page, `number-${width}`);
  });
}
