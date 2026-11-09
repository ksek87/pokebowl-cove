import { expect, type Locator, type Page, test } from '@playwright/test';
import { DEFAULT_PAGE_SIZE, POKEMON_FIELDS } from '../src/search/settings.ts';

const NETWORK_TIMEOUT = 15_000;

function firstResult(page: Page): Locator {
  return page.locator('atomic-result').first();
}

test.beforeEach(async ({ page }): Promise<void> => {
  await page.route(/pokemondb\.net/, (route) => route.abort());
});

test('searches when the search button is clicked', async ({ page }): Promise<void> => {
  await page.goto('/');
  await expect(firstResult(page)).toBeVisible({ timeout: NETWORK_TIMEOUT });

  await page.locator('atomic-search-box textarea:not([part="textarea-spacer"])').fill('pikachu');
  await page.locator('atomic-search-box [part~="submit-button"]').click();

  await expect(page).toHaveURL(/q=pikachu/, { timeout: NETWORK_TIMEOUT });
  await expect(firstResult(page).getByRole('link', { name: 'Pikachu' })).toBeVisible({ timeout: NETWORK_TIMEOUT });
});

test('moves to the next page with the pager', async ({ page }): Promise<void> => {
  await page.goto('/');
  await expect(firstResult(page).getByRole('link', { name: 'Bulbasaur' })).toBeVisible({ timeout: NETWORK_TIMEOUT });

  await page.locator('atomic-pager [part~="next-button"]').click();

  await expect(page).toHaveURL(new RegExp(`firstResult=${DEFAULT_PAGE_SIZE}`), { timeout: NETWORK_TIMEOUT });
  await expect(firstResult(page).getByRole('link', { name: 'Bulbasaur' })).toBeHidden({ timeout: NETWORK_TIMEOUT });
});

test('removes a facet filter from the breadbox', async ({ page }): Promise<void> => {
  await page.goto('/');
  await expect(firstResult(page)).toBeVisible({ timeout: NETWORK_TIMEOUT });

  await page.locator('atomic-facet').first().locator('[part="label-button"]').click();
  await page.locator('atomic-facet').first().getByRole('checkbox', { name: /Fire/ }).click();
  await expect(page).toHaveURL(new RegExp(`f-${POKEMON_FIELDS.type}=`), { timeout: NETWORK_TIMEOUT });

  await page.locator('atomic-breadbox [part~="breadcrumb-button"]').first().click();

  await expect(page).not.toHaveURL(new RegExp(`f-${POKEMON_FIELDS.type}=`), { timeout: NETWORK_TIMEOUT });
});
