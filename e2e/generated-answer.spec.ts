import type { Locator, Page } from '@playwright/test';
import { DEFAULT_PAGE_SIZE } from '../src/search/settings.ts';
import { ANSWER_STREAM_ROUTE, expect, stubAnswer, test } from './fixtures.ts';

const NETWORK_TIMEOUT = 15_000;
const WINDOW_HEIGHT = 900;
const WIDTHS = [1100, 1440, 1920, 2560];
const LAPTOP = 1440;
const TOLERANCE_PX = 2;
const CHECK_WAIT_MS = 1_000;
const HALF = 2;
const QUESTION = '/#q=what%20type%20is%20charizard';
const ANSWER_TEXT = 'Charizard is a Fire and Flying type.';
const CITATION = { title: 'Charizard Pokédex', clickUri: 'https://pokemondb.net/pokedex/charizard' };

function answerPanel(page: Page): Locator {
  return page.locator('atomic-generated-answer [part~="container"]');
}

async function open(page: Page, width: number, path: string): Promise<void> {
  await page.setViewportSize({ width, height: WINDOW_HEIGHT });
  await page.route(/pokemondb\.net/, (route) => route.abort());
  await page.goto(path);
  await expect(page.locator('atomic-result').first()).toBeVisible({ timeout: NETWORK_TIMEOUT });
}

async function top(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (box === null) {
    throw new Error(`Element is not visible: ${locator.toString()}`);
  }
  return box.y;
}

async function centerX(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (box === null) {
    throw new Error(`Element is not visible: ${locator.toString()}`);
  }
  return box.x + box.width / HALF;
}

async function countStreams(page: Page, path: string): Promise<number> {
  let streams = 0;
  await page.route(ANSWER_STREAM_ROUTE, async (route): Promise<void> => {
    streams += 1;
    await route.fallback();
  });
  await open(page, LAPTOP, path);
  await page.waitForTimeout(CHECK_WAIT_MS);
  return streams;
}

test('shows the answer, a citation and a disclaimer', async ({ page }): Promise<void> => {
  await stubAnswer(page, ANSWER_TEXT, CITATION);
  await open(page, LAPTOP, QUESTION);

  const panel = answerPanel(page);
  await expect(panel).toContainText(ANSWER_TEXT, { timeout: NETWORK_TIMEOUT });
  await expect(panel).toContainText(/may contain errors/i);
  const citation = panel.locator('[part~="citation"]').first();
  await expect(citation).toContainText(CITATION.title);
  await expect(citation).toHaveAttribute('href', new RegExp(CITATION.clickUri));
});

test('places the answer between the controls and the results', async ({ page }): Promise<void> => {
  await stubAnswer(page, ANSWER_TEXT, CITATION);
  await open(page, LAPTOP, QUESTION);
  const panel = answerPanel(page);
  await expect(panel).toBeVisible({ timeout: NETWORK_TIMEOUT });

  const controlsTop = await top(page.locator('atomic-sort-dropdown'));
  const panelTop = await top(panel);
  const firstCardTop = await top(page.locator('[data-slot="pokemon-card"]').first());

  expect(controlsTop).toBeLessThan(panelTop);
  expect(panelTop).toBeLessThan(firstCardTop);
});

test('shows no answer panel and no gap when no answer is generated', async ({ page }): Promise<void> => {
  await open(page, LAPTOP, QUESTION);
  await page.waitForTimeout(CHECK_WAIT_MS);

  await expect(answerPanel(page)).toHaveCount(0);
  const answerHeight = await page.locator('atomic-generated-answer').evaluate((host): number => host.getBoundingClientRect().height);
  expect(answerHeight).toBeLessThanOrEqual(TOLERANCE_PX);
  await expect(page.locator('atomic-result')).toHaveCount(DEFAULT_PAGE_SIZE);
});

test('keeps the search results when the answer stream fails', async ({ page }): Promise<void> => {
  await page.route(ANSWER_STREAM_ROUTE, (route) => route.fulfill({ status: 404 }));
  await open(page, LAPTOP, QUESTION);
  await page.waitForTimeout(CHECK_WAIT_MS);

  await expect(page.locator('atomic-result')).toHaveCount(DEFAULT_PAGE_SIZE);
  await expect(page.locator('[data-slot="search-state"]')).toHaveText('');
});

for (const path of ['/', '/#q=25']) {
  test(`does not request an answer for ${path}`, async ({ page }): Promise<void> => {
    expect(await countStreams(page, path)).toBe(0);
  });
}

test('does not look broken when results are sorted by name', async ({ page }): Promise<void> => {
  await stubAnswer(page, ANSWER_TEXT, CITATION);
  await open(page, LAPTOP, QUESTION);
  await expect(answerPanel(page)).toBeVisible({ timeout: NETWORK_TIMEOUT });

  await page.locator('atomic-sort-dropdown select').selectOption({ label: 'Name A to Z' });

  await expect(page.locator('atomic-sort-dropdown select option:checked')).toHaveText('Name A to Z');
  await expect(page.locator('atomic-result').first()).toBeVisible({ timeout: NETWORK_TIMEOUT });
  await expect(page.locator('[data-slot="search-state"]')).toHaveText('');
});

test('matches the panel design', async ({ page }): Promise<void> => {
  await stubAnswer(page, ANSWER_TEXT, CITATION);
  await open(page, LAPTOP, QUESTION);
  const panel = answerPanel(page);
  await expect(panel).toBeVisible({ timeout: NETWORK_TIMEOUT });

  const styles = await panel.evaluate((element) => {
    const style = getComputedStyle(element);
    const facet = document.querySelector('atomic-facet')?.shadowRoot?.querySelector('[part~="facet"]');
    const facetStyle = facet ? getComputedStyle(facet) : style;
    return {
      radius: style.borderTopLeftRadius,
      facetRadius: facetStyle.borderTopLeftRadius,
      border: style.borderTopWidth,
      facetBorder: facetStyle.borderTopWidth,
      shadow: style.boxShadow,
    };
  });

  expect(styles.radius).toBe(styles.facetRadius);
  expect(styles.border).toBe(styles.facetBorder);
  expect(styles.shadow).toBe('none');
});

for (const width of WIDTHS) {
  test(`keeps the layout rules with an answer at ${width}px`, async ({ page }): Promise<void> => {
    await stubAnswer(page, ANSWER_TEXT, CITATION);
    await open(page, width, QUESTION);
    await expect(answerPanel(page)).toBeVisible({ timeout: NETWORK_TIMEOUT });

    const summaryTop = await top(page.locator('atomic-query-summary'));
    const facetValues = page.locator('atomic-facet').getByRole('checkbox');
    await expect(facetValues).toHaveCount(0);
    expect(await top(page.locator('atomic-sort-dropdown'))).toBeLessThan(summaryTop + WINDOW_HEIGHT);
    const pagerCenter = await centerX(page.locator('atomic-pager'));
    expect(Math.abs(pagerCenter - width / HALF)).toBeLessThanOrEqual(TOLERANCE_PX);
    const hasSidewaysScroll = await page.evaluate((): boolean => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasSidewaysScroll).toBe(false);

    const results = await page.locator('atomic-layout-section[section="results"]').boundingBox();
    const panel = await answerPanel(page).boundingBox();
    expect(Math.abs((panel?.x ?? 0) - (results?.x ?? 0))).toBeLessThanOrEqual(TOLERANCE_PX);
    expect(Math.abs((panel?.width ?? 0) - (results?.width ?? 0))).toBeLessThanOrEqual(TOLERANCE_PX);
  });
}
