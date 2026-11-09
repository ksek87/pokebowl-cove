import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { pokemonDetailHref } from '../src/search/pokemonDetail.ts';
import { POKEMON_STATS } from '../src/search/settings.ts';

const NETWORK_TIMEOUT = 15_000;
const ANALYTICS_REQUEST = /analytics|events\/v1/;
const STAT_ROW = '[data-slot="pokemon-stat"]';

test.beforeEach(async ({ page }): Promise<void> => {
  await page.route(ANALYTICS_REQUEST, (route) => route.fulfill({ status: 200, json: { events: [] } }));
  await page.route(/pokemondb\.net/, (route) => route.abort());
});

async function openDetail(page: Page, name: string): Promise<void> {
  await page.goto(pokemonDetailHref(name));
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible({ timeout: NETWORK_TIMEOUT });
}

test('shows every detail of a Pokémon at a shareable URL', async ({ page }): Promise<void> => {
  await openDetail(page, 'Charizard');

  await expect(page.getByText('#0006')).toBeVisible();
  await expect(page.getByText('Generation 1')).toBeVisible();
  await expect(page.getByText('Flame Pokémon')).toBeVisible();
  await expect(page.getByText('1.7 m')).toBeVisible();
  await expect(page.getByText('90.5 kg')).toBeVisible();
  await expect(page.getByText('Solar Power')).toBeVisible();
  await expect(page.getByText('Fire', { exact: true })).toBeVisible();
  await expect(page.locator(STAT_ROW)).toHaveCount(POKEMON_STATS.length);
  await expect(page.getByText('534')).toBeVisible();
  await expect(page.getByRole('link', { name: /pokemondb\.net/i })).toHaveAttribute('href', /pokedex\/charizard/);
  await expect(page).toHaveTitle(/Charizard/);
});

test('finds a name with punctuation', async ({ page }): Promise<void> => {
  await openDetail(page, 'Mr. Mime');

  await expect(page.getByText('Barrier Pokémon')).toBeVisible();
});

test('handles a new Pokémon with no number or stats', async ({ page }): Promise<void> => {
  await openDetail(page, 'Gecqua');

  await expect(page.getByText('???')).toBeHidden();
  await expect(page.locator(STAT_ROW)).toHaveCount(0);
  await expect(page.getByText('Base stats are not available yet')).toBeVisible();
});

for (const name of ['Not A Pokemon', '*', '?????']) {
  test(`shows a clear not-found state for ${name}`, async ({ page }): Promise<void> => {
    await page.goto(pokemonDetailHref(name));

    await expect(page.getByRole('heading', { name: 'Pokémon not found' })).toBeVisible({ timeout: NETWORK_TIMEOUT });
    await expect(page.getByRole('link', { name: /back to search/i })).toHaveAttribute('href', '/');
  });
}

test('opens from a search result, logs the click, and returns to the search', async ({ page }): Promise<void> => {
  await page.goto('/#q=charizard');
  const card = page.locator('atomic-result').first();
  await expect(card.getByText('Charizard').first()).toBeVisible({ timeout: NETWORK_TIMEOUT });
  const click = page.waitForRequest(
    (request): boolean => ANALYTICS_REQUEST.test(request.url()) && (request.postData() ?? '').includes('itemMetadata'),
  );

  await card.locator('[data-slot="pokemon-card"]').click();

  await click;
  await expect(page).toHaveURL(/\?pokemon=Charizard/);
  await expect(page.getByRole('heading', { level: 1, name: 'Charizard' })).toBeVisible({ timeout: NETWORK_TIMEOUT });

  await page.getByRole('link', { name: /back to search/i }).click();

  await expect(page).toHaveURL(/#q=charizard/);
  await expect(page.locator('atomic-result').first()).toBeVisible({ timeout: NETWORK_TIMEOUT });
});

test('sends no analytics from the detail lookup', async ({ page }): Promise<void> => {
  const events: string[] = [];
  page.on('request', (request): void => {
    if (ANALYTICS_REQUEST.test(request.url())) {
      events.push(request.url());
    }
  });

  await openDetail(page, 'Charizard');

  expect(events).toEqual([]);
});
