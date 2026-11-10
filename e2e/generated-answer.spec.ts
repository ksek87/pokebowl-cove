import type { Locator, Page } from '@playwright/test';
import { ANSWER_PLACEHOLDER_PAUSE_MS, DEFAULT_PAGE_SIZE } from '../src/search/settings.ts';
import { ANSWER_STREAM_ROUTE, expect, holdAnswer, stubAnswer, test } from './fixtures.ts';

const NETWORK_TIMEOUT = 15_000;
const WINDOW_HEIGHT = 900;
const WIDTHS = [1100, 1440, 1920, 2560];
const LAPTOP = 1440;
const TOLERANCE_PX = 2;
const CHECK_WAIT_MS = 1_000;
const HALF = 2;
const FEEDBACK_BUTTON_COUNT = 2;
const QUESTION = '/#q=what%20type%20is%20charizard';
const ANSWER_TEXT = 'Charizard is a Fire and Flying type.';
const CITATION = { title: 'Charizard Pokédex', clickUri: 'https://pokemondb.net/pokedex/charizard' };
// On live Coveo, a stream with no answer sent its header up to 350 ms after the results, and ended within 13 ms of it.
const HEADER_WAIT_MS = 350;
const HEADER_TO_END_MS = 13;
// Frames are sampled once per animation frame, so a time can be off by about one frame.
const FRAME_MS = 20;

interface Frame {
  time: number;
  cardTop: number | null;
  hasPlaceholder: boolean;
}

declare global {
  interface Window {
    answerFrames: Frame[];
  }
}

/** Records, on every animation frame, where the first result card is and whether the placeholder is on the page. */
async function recordFrames(page: Page): Promise<void> {
  await page.addInitScript((): void => {
    const findDeep = (root: ParentNode, selector: string): Element | null => {
      const found = root.querySelector(selector);
      if (found) {
        return found;
      }
      for (const element of root.querySelectorAll('*')) {
        const inner = element.shadowRoot ? findDeep(element.shadowRoot, selector) : null;
        if (inner) {
          return inner;
        }
      }
      return null;
    };
    window.answerFrames = [];
    const sample = (time: number): void => {
      const card = findDeep(document, 'atomic-result');
      window.answerFrames.push({
        time,
        cardTop: card ? card.getBoundingClientRect().top : null,
        hasPlaceholder: document.querySelector('[data-slot="answer-placeholder"]') !== null,
      });
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

async function readFrames(page: Page): Promise<Frame[]> {
  return page.evaluate((): Frame[] => window.answerFrames);
}

function answerPanel(page: Page): Locator {
  return page.locator('atomic-generated-answer [part~="container"]');
}

function answerPlaceholder(page: Page): Locator {
  return page.locator('[data-slot="answer-placeholder"]');
}

async function lineAnimation(page: Page): Promise<string> {
  return answerPlaceholder(page)
    .locator('[data-slot="answer-placeholder-line"]')
    .first()
    .evaluate((line): string => getComputedStyle(line).animationName);
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

test('shows the feedback buttons on the answer', async ({ page }): Promise<void> => {
  await stubAnswer(page, ANSWER_TEXT, CITATION);
  await open(page, LAPTOP, QUESTION);
  await expect(answerPanel(page)).toContainText(ANSWER_TEXT, { timeout: NETWORK_TIMEOUT });

  const buttons = page.locator('atomic-generated-answer [part~="feedback-button"]');
  await expect(buttons).toHaveCount(FEEDBACK_BUTTON_COUNT);
  for (const button of await buttons.all()) {
    await expect(button).toBeVisible();
  }
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

test('holds the answer place while the answer is prepared, then shows the answer there', async ({ page }): Promise<void> => {
  const held = await holdAnswer(page);
  await open(page, LAPTOP, QUESTION);
  await held.header();

  const placeholder = answerPlaceholder(page);
  await expect(placeholder).toBeVisible({ timeout: NETWORK_TIMEOUT });
  await expect(placeholder).toHaveText('Generating an answer…');
  await expect(answerPanel(page)).toHaveCount(0);
  expect(await lineAnimation(page)).not.toBe('none');
  const placeholderTop = await top(placeholder);

  await held.answer(ANSWER_TEXT, CITATION);

  await expect(answerPanel(page)).toContainText(ANSWER_TEXT, { timeout: NETWORK_TIMEOUT });
  await expect(placeholder).toHaveCount(0);
  expect(Math.abs((await top(answerPanel(page))) - placeholderTop)).toBeLessThanOrEqual(TOLERANCE_PX);
});

test('shows the placeholder only after the stream header and the pause, and opens it from zero height', async ({ page }): Promise<void> => {
  await recordFrames(page);
  const held = await holdAnswer(page);
  await open(page, LAPTOP, QUESTION);
  await page.waitForTimeout(CHECK_WAIT_MS);
  await expect(answerPlaceholder(page)).toHaveCount(0);

  await held.header();
  await expect(answerPlaceholder(page)).toBeVisible({ timeout: NETWORK_TIMEOUT });
  const opening = page.locator('[data-slot="answer-placeholder-opening"]');

  expect(await opening.evaluate((element): string => getComputedStyle(element).animationName)).toBe('answer-open');
  const headerAt = await page.evaluate((): number => window.heldAnswer.headerAt ?? 0);
  const shownAt = (await readFrames(page)).find((frame): boolean => frame.hasPlaceholder)?.time ?? 0;
  expect(shownAt - headerAt).toBeGreaterThanOrEqual(ANSWER_PLACEHOLDER_PAUSE_MS - FRAME_MS);
});

test('never shows the placeholder or moves the results when the stream ends right after its header', async ({ page }): Promise<void> => {
  await recordFrames(page);
  const held = await holdAnswer(page);
  await open(page, LAPTOP, QUESTION);
  await page.waitForTimeout(HEADER_WAIT_MS);
  await held.header();
  await page.waitForTimeout(HEADER_TO_END_MS);
  await held.noAnswer();
  await page.waitForTimeout(CHECK_WAIT_MS);

  const frames = (await readFrames(page)).filter((frame): boolean => frame.cardTop !== null);
  expect(frames.some((frame): boolean => frame.hasPlaceholder)).toBe(false);
  const tops = frames.map((frame): number => frame.cardTop ?? 0);
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(TOLERANCE_PX);
});

test('removes the placeholder when no answer is generated', async ({ page }): Promise<void> => {
  const held = await holdAnswer(page);
  await open(page, LAPTOP, QUESTION);
  await held.header();
  await expect(answerPlaceholder(page)).toBeVisible({ timeout: NETWORK_TIMEOUT });

  await held.noAnswer();

  await expect(answerPlaceholder(page)).toHaveCount(0);
  await expect(answerPanel(page)).toHaveCount(0);
  await expect(page.locator('atomic-result')).toHaveCount(DEFAULT_PAGE_SIZE);
});

test('shows no placeholder for an empty search', async ({ page }): Promise<void> => {
  await holdAnswer(page);
  await open(page, LAPTOP, '/');
  await page.waitForTimeout(CHECK_WAIT_MS);

  await expect(answerPlaceholder(page)).toHaveCount(0);
});

test('shows the placeholder with no animation when reduced motion is requested', async ({ page }): Promise<void> => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const held = await holdAnswer(page);
  await open(page, LAPTOP, QUESTION);
  await held.header();

  await expect(answerPlaceholder(page)).toHaveText('Generating an answer…', { timeout: NETWORK_TIMEOUT });
  expect(await lineAnimation(page)).toBe('none');
  const opening = page.locator('[data-slot="answer-placeholder-opening"]');
  const style = await opening.evaluate((element) => {
    const computed = getComputedStyle(element);
    const card = element.querySelector('[data-slot="answer-placeholder"]');
    const cardBox = card ? card.getBoundingClientRect().height + parseFloat(getComputedStyle(card).marginBottom) : 0;
    return {
      animation: computed.animationName,
      transition: computed.transitionDuration,
      opacity: computed.opacity,
      missingHeight: cardBox - element.getBoundingClientRect().height,
    };
  });
  expect(style.animation).toBe('none');
  expect(style.transition).toBe('0s');
  expect(style.opacity).toBe('1');
  expect(style.missingHeight).toBeLessThanOrEqual(TOLERANCE_PX);
});

test('gives the placeholder the edges of the answer card', async ({ page }): Promise<void> => {
  const held = await holdAnswer(page);
  await open(page, LAPTOP, QUESTION);
  const edges = async (locator: Locator): Promise<string> =>
    locator.evaluate((element): string => {
      const style = getComputedStyle(element);
      return [style.borderTopWidth, style.borderTopColor, style.borderTopLeftRadius, style.backgroundColor, style.marginBottom].join(' ');
    });
  await held.header();
  await expect(answerPlaceholder(page)).toBeVisible({ timeout: NETWORK_TIMEOUT });
  const placeholderEdges = await edges(answerPlaceholder(page));

  await held.answer(ANSWER_TEXT, CITATION);
  await expect(answerPanel(page)).toBeVisible({ timeout: NETWORK_TIMEOUT });

  expect(placeholderEdges).toBe(await edges(answerPanel(page)));
});
