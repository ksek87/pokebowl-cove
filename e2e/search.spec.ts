import { expect, type Locator, type Page, test } from '@playwright/test';
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from '../src/search/settings.ts';

const NETWORK_TIMEOUT = 15_000;
const ALIGNMENT_TOLERANCE_PX = 2;
const MIN_SEARCH_BOX_GROWTH_PX = 20;
const WINDOW_HEIGHT = 900;
const NO_RESULTS = 0;
const ONE_RESULT = 1;
const NARROW_DESKTOP = 1100;
const LAPTOP = 1440;
const FULL_HD = 1920;
const LARGE_DESKTOP = 2560;
const DESKTOP_WIDTHS = [NARROW_DESKTOP, LAPTOP, FULL_HD, LARGE_DESKTOP];
const NEXT_PAGE_SIZE = PAGE_SIZES.find((size): boolean => size !== DEFAULT_PAGE_SIZE);
const LONG_QUERY_REPEATS = 4;
const LONG_QUERY = 'which fire type pokemon can learn to fly and also resist grass attacks '.repeat(
  LONG_QUERY_REPEATS,
);

type Box = NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>;

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  if (box === null) {
    throw new Error(`Element is not visible: ${locator.toString()}`);
  }
  return box;
}

function searchInput(page: Page): Locator {
  return page.locator('atomic-search-box textarea:not([part="textarea-spacer"])');
}

async function openDesktopPage(page: Page, width: number): Promise<void> {
  await page.setViewportSize({ width, height: WINDOW_HEIGHT });
  await page.goto('/');
  await expect(page.locator('atomic-result').first()).toBeVisible({ timeout: NETWORK_TIMEOUT });
}

test('shows Pokémon results with names and pictures from Coveo', async ({ page }): Promise<void> => {
  await page.goto('/');

  const firstResult = page.locator('atomic-result').first();
  await expect(firstResult.getByRole('link').first()).toHaveAccessibleName(/\w+/, {
    timeout: NETWORK_TIMEOUT,
  });

  const picture = firstResult.locator('[data-slot="pokemon-image"]');
  await expect(picture).toBeVisible();
  await expect
    .poll(() => picture.evaluate((img: HTMLImageElement): number => img.naturalWidth))
    .toBeTruthy();
});

test('filters results with the Type facet', async ({ page }): Promise<void> => {
  await page.goto('/');

  const summary = page.locator('atomic-query-summary');
  await expect(summary).toContainText('Results', { timeout: NETWORK_TIMEOUT });
  const unfiltered = await summary.innerText();

  await page
    .locator('atomic-facet[field="pokemon_type"]')
    .getByRole('checkbox', { name: /Fire/ })
    .click();

  await expect(summary).not.toHaveText(unfiltered);
});

test('lists every Generation facet value in numeric order', async ({ page }): Promise<void> => {
  await page.goto('/');

  const generations = page
    .locator('atomic-facet[field="pokemon_generation"]')
    .getByRole('checkbox', { name: /Generation \d+/ });
  await expect(generations.first()).toBeVisible({ timeout: NETWORK_TIMEOUT });

  const labels = await generations.evaluateAll((boxes): (string | null)[] =>
    boxes.map((box): string | null => box.getAttribute('aria-label')),
  );
  const numbers = labels.map((label): number => Number(/Generation (?<n>\d+)/.exec(label ?? '')?.groups?.n));

  expect(numbers).toEqual([...numbers].sort((a, b): number => a - b));
  expect(numbers).not.toContain(Number.NaN);
});

test('changes how many results are shown', async ({ page }): Promise<void> => {
  await page.goto('/');

  await expect(page.locator('atomic-result')).toHaveCount(DEFAULT_PAGE_SIZE, {
    timeout: NETWORK_TIMEOUT,
  });

  await page.getByRole('combobox', { name: 'Results per page' }).click();
  await page.getByRole('option', { name: String(NEXT_PAGE_SIZE), exact: true }).click();

  await expect(page.locator('atomic-result')).toHaveCount(Number(NEXT_PAGE_SIZE));
});

for (const width of DESKTOP_WIDTHS) {
  test(`fills every row at ${width}px`, async ({ page }): Promise<void> => {
    await openDesktopPage(page, width);
    await expect(page.locator('atomic-result')).toHaveCount(DEFAULT_PAGE_SIZE);

    const tops = await page
      .locator('atomic-result')
      .evaluateAll((results): number[] => results.map((r): number => Math.round(r.getBoundingClientRect().top)));
    const rowCounts = new Map<number, number>();
    tops.forEach((top): void => {
      rowCounts.set(top, (rowCounts.get(top) ?? NO_RESULTS) + ONE_RESULT);
    });

    expect(new Set(rowCounts.values()).size).toBe(ONE_RESULT);
  });

  test(`centers the page content at ${width}px`, async ({ page }): Promise<void> => {
    await openDesktopPage(page, width);

    // Comparing doubled centers against the window width avoids dividing by two.
    const windowWidth = await page.evaluate((): number => document.documentElement.clientWidth);
    const search = await boxOf(page.locator('atomic-search-box'));
    const header = await boxOf(page.locator('[data-slot="home-link"]'));
    const facets = await boxOf(page.locator('atomic-facet').first());
    const results = await boxOf(page.locator('atomic-result-list'));
    const status = await boxOf(page.locator("atomic-layout-section[section='status']"));

    expect(Math.abs(search.x + search.x + search.width - windowWidth)).toBeLessThanOrEqual(ALIGNMENT_TOLERANCE_PX);
    expect(Math.abs(header.x + header.x + header.width - windowWidth)).toBeLessThanOrEqual(ALIGNMENT_TOLERANCE_PX);
    expect(Math.abs(facets.x + results.x + results.width - windowWidth)).toBeLessThanOrEqual(ALIGNMENT_TOLERANCE_PX);
    expect(Math.abs(facets.y - status.y)).toBeLessThanOrEqual(ALIGNMENT_TOLERANCE_PX);
    expect(search.width).toBeLessThan(results.width);
  });
}

test('clearing the search shows all Pokémon again', async ({ page }): Promise<void> => {
  await page.goto('/');
  const summary = page.locator('atomic-query-summary');

  await searchInput(page).fill('charizard');
  await searchInput(page).press('Enter');
  await expect(summary.getByText('charizard')).toBeVisible({ timeout: NETWORK_TIMEOUT });

  await page.locator('atomic-search-box [part="clear-button"]').click();

  await expect(summary.getByText('charizard')).toBeHidden();
  await expect(page.locator('atomic-result')).toHaveCount(DEFAULT_PAGE_SIZE);
});

test('opens a shared search link without clearing it', async ({ page }): Promise<void> => {
  await page.goto('/#q=charizard');

  await expect(page.locator('atomic-query-summary').getByText('charizard')).toBeVisible({
    timeout: NETWORK_TIMEOUT,
  });
});

test('grows the search box downward for long text', async ({ page }): Promise<void> => {
  await openDesktopPage(page, LAPTOP);
  const search = page.locator('atomic-search-box');
  const before = await boxOf(search);

  await searchInput(page).fill(LONG_QUERY);

  await expect
    .poll(async (): Promise<number> => (await boxOf(search)).height)
    .toBeGreaterThan(before.height + MIN_SEARCH_BOX_GROWTH_PX);
  expect((await boxOf(search)).width).toBe(before.width);
});

test('returns home from a search with the Poké Ball', async ({ page }): Promise<void> => {
  await page.goto('/#q=charizard');
  const summary = page.locator('atomic-query-summary');
  await expect(summary.getByText('charizard')).toBeVisible({ timeout: NETWORK_TIMEOUT });

  await page.getByRole('link', { name: 'Go to the home page' }).click();

  await expect(summary.getByText('charizard')).toBeHidden({ timeout: NETWORK_TIMEOUT });
  await expect(page.locator('atomic-result')).toHaveCount(DEFAULT_PAGE_SIZE);
});

test('shows a number-only search as a Pokédex lookup', async ({ page }): Promise<void> => {
  await page.goto('/#q=3');

  await expect(page.locator('atomic-result')).toHaveCount(ONE_RESULT, { timeout: NETWORK_TIMEOUT });
  await expect(page.getByRole('status').filter({ hasText: 'Pokédex lookup' })).toContainText('#0003');
  await expect(page.locator('atomic-result').getByRole('link', { name: 'Venusaur' })).toBeVisible();
});

test('opens the home page in Pokédex order', async ({ page }): Promise<void> => {
  await page.goto('/');

  await expect(page.locator('atomic-result').first().getByRole('link', { name: 'Bulbasaur' })).toBeVisible({
    timeout: NETWORK_TIMEOUT,
  });
});

test('corrects a misspelled search', async ({ page }): Promise<void> => {
  await page.goto('/#q=charzard');

  await expect(page.locator('atomic-result').first().getByRole('link', { name: 'Charizard' })).toBeVisible({
    timeout: NETWORK_TIMEOUT,
  });
  await expect(page.locator('atomic-did-you-mean')).toContainText('charizard');
});

test('sorts results by name', async ({ page }): Promise<void> => {
  await page.goto('/#sortCriteria=%40pokemon_name%20ascending');

  await expect(page.locator('atomic-result').first().getByRole('link', { name: 'Abomasnow' })).toBeVisible({
    timeout: NETWORK_TIMEOUT,
  });
});
