import { expect, test } from '@playwright/test';

test('shows Pokémon results with names and pictures from Coveo', async ({ page }) => {
  await page.goto('/');

  const firstResult = page.locator('atomic-result').first();
  await expect(firstResult.getByRole('link').first()).toHaveAccessibleName(/\w+/, {
    timeout: 15_000,
  });

  const picture = firstResult.locator('atomic-result-image img');
  await expect(picture).toBeVisible();
  await expect.poll(() => picture.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
});

test('filters results with the Type facet', async ({ page }) => {
  await page.goto('/');

  const summary = page.locator('atomic-query-summary');
  await expect(summary).toContainText('Results', { timeout: 15_000 });
  const unfiltered = await summary.innerText();

  await page.locator('atomic-facet[field="pokemon_type"]').getByRole('checkbox', { name: /Fire/ }).click();

  await expect(summary).not.toHaveText(unfiltered);
  await expect(page.locator('atomic-breadbox, atomic-facet[field="pokemon_type"]').first()).toContainText('Fire');
});

test('lists Generation facet values in numeric order', async ({ page }) => {
  await page.goto('/');

  const generations = page
    .locator('atomic-facet[field="pokemon_generation"]')
    .getByRole('checkbox', { name: /Generation \d+/ });
  await expect(generations).toHaveCount(10, { timeout: 15_000 });

  await expect(generations.nth(8)).toHaveAccessibleName(/Generation 9\b/);
  await expect(generations.nth(9)).toHaveAccessibleName(/Generation 10\b/);
});
