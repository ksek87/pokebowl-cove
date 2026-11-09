import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { pokemonDetailHref, sourceLinkLabel } from '../src/search/pokemonDetail.ts';
import { POKEMON_STATS } from '../src/search/settings.ts';

const NETWORK_TIMEOUT = 15_000;
const ANALYTICS_REQUEST = /analytics|events\/v1/;
const STORED_PAGE_REQUEST = '**/rest/search/v2/html**';
const POKEDEX_SECTION = 'section[aria-label="Pokédex entries"]';
const STAT_ROW = '[data-slot="pokemon-stat"]';

test.beforeEach(async ({ page }): Promise<void> => {
  await page.route(ANALYTICS_REQUEST, (route) => route.fulfill({ status: 200, json: { events: [] } }));
  await page.route(/pokemondb\.net/, (route) => route.abort());
});

function entryRow(game: string, text: string): string {
  return `<tr><th><span class="igame">${game}</span></th><td class="cell-med-text">${text}</td></tr>`;
}

const STORED_PAGE =
  '<h2>Pokédex entries</h2><h3>Charizard</h3><table>' +
  entryRow('Red', 'Older entry text.') +
  entryRow('Scarlet', 'Newest entry text.') +
  '</table>';

async function stubStoredPage(page: Page, body: string): Promise<void> {
  await page.route(STORED_PAGE_REQUEST, (route) => route.fulfill({ status: 200, contentType: 'text/html', body }));
}

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
  const sourceLink = page.getByRole('link', { name: sourceLinkLabel('Charizard') });
  await expect(sourceLink).toHaveAttribute('href', /pokemondb\.net\/pokedex\/charizard/);
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

test('shows the most recent Pokédex entry with more behind a control', async ({ page }): Promise<void> => {
  await stubStoredPage(page, STORED_PAGE);
  await openDetail(page, 'Charizard');
  const section = page.locator(POKEDEX_SECTION);

  await expect(section.getByText('Newest entry text.')).toBeVisible({ timeout: NETWORK_TIMEOUT });
  await expect(section.getByText('Older entry text.')).toBeHidden();

  await section.getByText(/More entries/).click();

  await expect(section.getByText('Older entry text.')).toBeVisible();
  await expect(section.getByRole('link', { name: 'Pokémon Database' })).toHaveAttribute('href', /pokedex\/charizard/);
});

test('hides the Pokédex section when the page has no entries', async ({ page }): Promise<void> => {
  await stubStoredPage(page, '<h2>Base stats</h2>');
  const stored = page.waitForResponse(STORED_PAGE_REQUEST);
  await openDetail(page, 'Charizard');
  await stored;

  await expect(page.locator(POKEDEX_SECTION)).toHaveCount(0);
});

test('keeps the details when the stored page cannot be loaded', async ({ page }): Promise<void> => {
  await page.route(STORED_PAGE_REQUEST, (route) => route.abort());
  await openDetail(page, 'Charizard');

  await expect(page.getByText('Flame Pokémon')).toBeVisible();
  await expect(page.locator(POKEDEX_SECTION)).toHaveCount(0, { timeout: NETWORK_TIMEOUT });
});

test('loading the entries does not move the details and logs no analytics', async ({ page }): Promise<void> => {
  const events: string[] = [];
  page.on('request', (request): void => {
    if (ANALYTICS_REQUEST.test(request.url())) {
      events.push(request.url());
    }
  });
  let releaseStoredPage = (): void => undefined;
  const held = new Promise<void>((resolve): void => {
    releaseStoredPage = resolve;
  });
  await page.route(STORED_PAGE_REQUEST, async (route) => {
    await held;
    await route.fulfill({ status: 200, contentType: 'text/html', body: STORED_PAGE });
  });
  await openDetail(page, 'Charizard');
  const heading = page.getByRole('heading', { level: 1, name: 'Charizard' });
  const before = await heading.boundingBox();

  releaseStoredPage();

  await expect(page.locator(POKEDEX_SECTION).getByText('Newest entry text.')).toBeVisible({ timeout: NETWORK_TIMEOUT });
  expect(await heading.boundingBox()).toEqual(before);
  expect(events).toEqual([]);
});

for (const [linkName, facet, value] of [
  ['Show all Fire Pokémon', 'pokemon_type', 'Fire'],
  ['Show all Generation 1 Pokémon', 'pokemon_generation', 'Generation 1'],
]) {
  test(`opens the filtered search from ${value}`, async ({ page }): Promise<void> => {
    await openDetail(page, 'Charizard');

    await page.getByRole('link', { name: linkName }).click();

    await expect(page).toHaveURL(new RegExp(`f-${facet}=${encodeURIComponent(value)}`));
    await expect(page.locator('atomic-result').first()).toBeVisible({ timeout: NETWORK_TIMEOUT });
    await expect(page.locator('atomic-breadbox')).toContainText(value);
  });
}

test('shows a visible focus outline on a Type link', async ({ page }): Promise<void> => {
  await openDetail(page, 'Charizard');
  const link = page.getByRole('link', { name: 'Show all Fire Pokémon' });

  await link.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');

  await expect(link).toBeFocused();
  await expect(link).toHaveCSS('outline-style', 'solid');
});
