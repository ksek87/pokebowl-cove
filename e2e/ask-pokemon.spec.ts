import type { Locator, Page, Route } from '@playwright/test';
import { ASK_POKEMON_QUESTIONS, POKEMON_FIELDS } from '../src/search/settings.ts';
import { askPokemonQuestion, pokemonDetailHref } from '../src/search/pokemonDetail.ts';
import { ANSWER_STREAM_ROUTE, expect, fulfillNoAnswer, stubAnswer, test } from './fixtures.ts';

const NETWORK_TIMEOUT = 15_000;
const CHECK_WAIT_MS = 1_000;
const WINDOW_HEIGHT = 900;
const SHORT_WINDOW_HEIGHT = 800;
const WINDOW_HEIGHTS = [SHORT_WINDOW_HEIGHT, WINDOW_HEIGHT];
const WIDTHS = [1100, 1440, 1920, 2560];
const ONE_SEARCH = 1;
const LONG_ANSWER_REPEATS = 60;
const LAPTOP_WIDTH = 1440;
const HALF = 2;
const TAIL_GAP_TOLERANCE_PX = 2;
const INSIDE_OFFSET_PX = 8;
const NO_REQUESTS = 0;
const MIN_BUBBLE_WIDTH_PX = 540;
const TYPICAL_ANSWER_REPEATS = 24;
const MAX_CORNER_INSET_PX = 24;
const NAME = 'Charizard';
const ANSWER_TEXT = 'Charizard flies in search of strong opponents.';
const CITATION = { title: 'Charizard Pokédex', clickUri: 'https://pokemondb.net/pokedex/charizard' };
const QUESTIONS = ASK_POKEMON_QUESTIONS.map((template): string => askPokemonQuestion(template, NAME));
const [FIRST_QUESTION, SECOND_QUESTION] = QUESTIONS;
const LAUNCHER_NAME = `Ask about ${NAME}`;

interface SearchBody {
  q?: string;
  aq?: string;
}

function isSearchRequest(url: string, method: string): boolean {
  return method === 'POST' && /\/rest\/search\/v2(\?|$)/.test(url);
}

function isQuestionRequest(route: Route): boolean {
  const request = route.request();
  return (
    isSearchRequest(request.url(), request.method()) &&
    (JSON.parse(request.postData() ?? '{}') as SearchBody).q === FIRST_QUESTION
  );
}

async function openDetail(page: Page, name = NAME): Promise<void> {
  await page.route(/analytics|events\/v1/, (route) => route.fulfill({ status: 200, json: { events: [] } }));
  await page.route(/pokemondb\.net/, (route) => route.abort());
  await page.goto(pokemonDetailHref(name));
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible({ timeout: NETWORK_TIMEOUT });
}

function launcher(page: Page): Locator {
  return page.getByRole('button', { name: LAUNCHER_NAME });
}

function bubble(page: Page): Locator {
  return page.getByRole('dialog', { name: LAUNCHER_NAME });
}

function question(page: Page, text = FIRST_QUESTION): Locator {
  return bubble(page).getByRole('button', { name: text });
}

function answer(page: Page): Locator {
  return bubble(page).locator('atomic-generated-answer [part~="container"]');
}

function backToQuestions(page: Page): Locator {
  return bubble(page).getByRole('button', { name: 'Ask something else' });
}

function status(page: Page): Locator {
  return page.locator('[data-slot="ask-status"]');
}

async function openBubble(page: Page): Promise<void> {
  await launcher(page).click({ timeout: NETWORK_TIMEOUT });
  await expect(bubble(page)).toBeVisible();
}

async function countStreams(page: Page): Promise<() => number> {
  let streams = NO_REQUESTS;
  await page.route(ANSWER_STREAM_ROUTE, async (route): Promise<void> => {
    streams += ONE_SEARCH;
    await route.fallback();
  });
  return (): number => streams;
}

async function holdAnswer(page: Page): Promise<() => void> {
  let release: () => void = (): void => undefined;
  const released = new Promise<void>((resolve): void => {
    release = resolve;
  });
  await page.route(ANSWER_STREAM_ROUTE, async (route: Route): Promise<void> => {
    await released;
    await fulfillNoAnswer(route);
  });
  return (): void => release();
}

test('shows only the closed launcher and generates nothing on page load', async ({ page }): Promise<void> => {
  const streams = await countStreams(page);
  await openDetail(page);

  await expect(launcher(page)).toBeVisible({ timeout: NETWORK_TIMEOUT });
  await expect(launcher(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(bubble(page)).toHaveCount(NO_REQUESTS);
  await page.waitForTimeout(CHECK_WAIT_MS);
  expect(streams()).toBe(NO_REQUESTS);
});

test('opens a bubble with only the suggested questions and a tail', async ({ page }): Promise<void> => {
  const streams = await countStreams(page);
  await openDetail(page);
  await openBubble(page);

  await expect(launcher(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(bubble(page).getByRole('button')).toHaveCount(QUESTIONS.length);
  for (const text of QUESTIONS) {
    await expect(question(page, text)).toBeVisible();
  }
  await expect(question(page)).toBeFocused();
  await expect(bubble(page).getByRole('heading')).toHaveCount(NO_REQUESTS);
  await expect(bubble(page).getByRole('textbox')).toHaveCount(NO_REQUESTS);
  await expect(bubble(page)).not.toContainText(/hi!|know about/i);
  await expect(bubble(page).locator('[data-slot="ask-tail"]')).toBeVisible();
  await page.waitForTimeout(CHECK_WAIT_MS);
  expect(streams()).toBe(NO_REQUESTS);
});

test('opens to the left of the Pokéball with the tail pointing at it', async ({ page }): Promise<void> => {
  await page.setViewportSize({ width: LAPTOP_WIDTH, height: WINDOW_HEIGHT });
  await openDetail(page);
  await openBubble(page);

  const tail = await bubble(page).locator('[data-slot="ask-tail"]').boundingBox();
  const ball = await launcher(page).boundingBox();
  const box = await bubble(page).boundingBox();
  const tailCenter = (tail?.y ?? 0) + (tail?.height ?? 0) / HALF;
  expect(tailCenter).toBeGreaterThanOrEqual(ball?.y ?? 0);
  expect(tailCenter).toBeLessThanOrEqual((ball?.y ?? 0) + (ball?.height ?? 0));
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual((ball?.x ?? 0) + TAIL_GAP_TOLERANCE_PX);
  await expect
    .poll(async () => (await bubble(page).boundingBox())?.width ?? 0)
    .toBeGreaterThanOrEqual(MIN_BUBBLE_WIDTH_PX);
});

test('does not cover the Type badges', async ({ page }): Promise<void> => {
  await page.setViewportSize({ width: LAPTOP_WIDTH, height: WINDOW_HEIGHT });
  await openDetail(page);
  await openBubble(page);

  const badge = await page.locator('main li a').last().boundingBox();
  const box = await bubble(page).boundingBox();
  expect((badge?.x ?? 0) + (badge?.width ?? 0)).toBeLessThanOrEqual(box?.x ?? 0);
});

test('overlays the page instead of pushing the content', async ({ page }): Promise<void> => {
  await stubAnswer(page, `${ANSWER_TEXT} `.repeat(LONG_ANSWER_REPEATS), CITATION);
  await page.setViewportSize({ width: LAPTOP_WIDTH, height: WINDOW_HEIGHT });
  await openDetail(page);
  const stats = page.getByRole('heading', { name: 'Base stats' });
  await expect(launcher(page)).toBeVisible({ timeout: NETWORK_TIMEOUT });
  const before = await stats.boundingBox();

  await openBubble(page);
  await question(page).click();
  await expect(answer(page)).toContainText(ANSWER_TEXT, { timeout: NETWORK_TIMEOUT });

  expect((await stats.boundingBox())?.y).toBe(before?.y);
});

test('replaces the questions with a scoped answer and its citation', async ({ page }): Promise<void> => {
  await stubAnswer(page, ANSWER_TEXT, CITATION);
  await openDetail(page);
  await openBubble(page);
  const request = page.waitForRequest(
    (candidate): boolean =>
      isSearchRequest(candidate.url(), candidate.method()) &&
      (JSON.parse(candidate.postData() ?? '{}') as SearchBody).q === FIRST_QUESTION,
  );

  await question(page).click();

  const body = JSON.parse((await request).postData() ?? '{}') as SearchBody;
  expect(body.aq).toBe(`@${POKEMON_FIELDS.name}=="${NAME}"`);
  await expect(answer(page)).toContainText(ANSWER_TEXT, { timeout: NETWORK_TIMEOUT });
  await expect(answer(page)).toContainText(/may contain errors/i);
  await expect(bubble(page).locator('atomic-generated-answer [part~="citation"]').first()).toHaveAttribute(
    'href',
    CITATION.clickUri,
  );
  await expect(question(page)).toHaveCount(NO_REQUESTS);
  await expect(status(page)).toContainText(/answer ready/i);
  await expect(backToQuestions(page)).toBeFocused();
  await expect(page).not.toHaveURL(/#/);
});

test('wobbles the Pokéball and says it is thinking until the answer starts', async ({ page }): Promise<void> => {
  const release = await holdAnswer(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openDetail(page);
  await openBubble(page);

  await question(page).click();

  const thinking = bubble(page).locator('[data-slot="ask-thinking"]');
  await expect(thinking).toBeVisible({ timeout: NETWORK_TIMEOUT });
  await expect(status(page)).toContainText(/generating/i);
  await expect(launcher(page)).toHaveAttribute('data-thinking', 'true');
  const speed = (): Promise<string> =>
    launcher(page)
      .locator('img')
      .evaluate((image): string => getComputedStyle(image).animationDuration);
  const fast = await speed();
  release();
  await expect(thinking).toHaveCount(NO_REQUESTS, { timeout: NETWORK_TIMEOUT });
  await expect(launcher(page)).toHaveAttribute('data-thinking', 'false');
  expect(await speed()).not.toBe(fast);
});

test('returns to the questions and can ask the same question again', async ({ page }): Promise<void> => {
  await stubAnswer(page, ANSWER_TEXT, CITATION);
  const streams = await countStreams(page);
  await openDetail(page);
  await openBubble(page);

  await question(page).click();
  await expect(answer(page)).toContainText(ANSWER_TEXT, { timeout: NETWORK_TIMEOUT });
  await backToQuestions(page).click();

  await expect(answer(page)).toHaveCount(NO_REQUESTS);
  await expect(question(page)).toBeFocused();
  await expect(bubble(page).getByRole('button')).toHaveCount(QUESTIONS.length);
  await question(page).click();
  await expect(answer(page)).toContainText(ANSWER_TEXT, { timeout: NETWORK_TIMEOUT });
  expect(streams()).toBe(ONE_SEARCH + ONE_SEARCH);
});

test('replaces the last answer without leaving it visible', async ({ page }): Promise<void> => {
  await stubAnswer(page, ANSWER_TEXT, CITATION);
  await openDetail(page);
  await openBubble(page);
  await question(page).click();
  await expect(answer(page)).toContainText(ANSWER_TEXT, { timeout: NETWORK_TIMEOUT });
  await backToQuestions(page).click();

  const release = await holdAnswer(page);
  await question(page, SECOND_QUESTION).click();

  await expect(bubble(page).locator('[data-slot="ask-thinking"]')).toBeVisible({ timeout: NETWORK_TIMEOUT });
  await expect(bubble(page)).not.toContainText(ANSWER_TEXT);
  await expect(bubble(page).locator('atomic-generated-answer')).toHaveCount(ONE_SEARCH);
  release();
});

test('says so in the bubble when no answer comes back', async ({ page }): Promise<void> => {
  await openDetail(page);
  await openBubble(page);

  await question(page).click();

  await expect(bubble(page).locator('[data-slot="ask-message"]')).toContainText(/no answer/i, {
    timeout: NETWORK_TIMEOUT,
  });
  await expect(bubble(page).getByRole('button', { name: /try again/i })).toHaveCount(NO_REQUESTS);
  await expect(backToQuestions(page)).toBeVisible();
});

test('offers a retry in the bubble when the request fails', async ({ page }): Promise<void> => {
  await stubAnswer(page, ANSWER_TEXT, CITATION);
  let shouldFail = true;
  await page.route(/\/rest\/search\/v2(\?|$)/, async (route): Promise<void> => {
    if (shouldFail && isQuestionRequest(route)) {
      await route.fulfill({ status: 500, json: { message: 'failed' } });
      return;
    }
    await route.fallback();
  });
  await openDetail(page);
  await openBubble(page);

  await question(page).click();

  const retry = bubble(page).getByRole('button', { name: /try again/i });
  await expect(retry).toBeVisible({ timeout: NETWORK_TIMEOUT });
  shouldFail = false;
  await retry.click();
  await expect(answer(page)).toContainText(ANSWER_TEXT, { timeout: NETWORK_TIMEOUT });
  await expect(retry).toHaveCount(NO_REQUESTS);
});

test('scrolls a long answer inside the bubble and keeps the way back in view', async ({ page }): Promise<void> => {
  await stubAnswer(page, `${ANSWER_TEXT} `.repeat(LONG_ANSWER_REPEATS), CITATION);
  await page.setViewportSize({ width: LAPTOP_WIDTH, height: WINDOW_HEIGHT });
  await openDetail(page);
  await openBubble(page);
  const pageScrollBefore = await page.evaluate((): number => window.scrollY);

  await question(page).click();
  await expect(answer(page)).toContainText(ANSWER_TEXT, { timeout: NETWORK_TIMEOUT });

  const content = bubble(page).locator('[data-slot="ask-content"]');
  await expect
    .poll(() => content.evaluate((element): number => element.scrollHeight - element.clientHeight))
    .toBeGreaterThan(NO_REQUESTS);
  await content.evaluate((element): void => element.scrollTo({ top: element.scrollHeight }));
  await expect(backToQuestions(page)).toBeInViewport();
  expect(await page.evaluate((): number => window.scrollY)).toBe(pageScrollBefore);
});

test('shows a typical answer in full without inner scrolling', async ({ page }): Promise<void> => {
  await stubAnswer(page, `${ANSWER_TEXT} `.repeat(TYPICAL_ANSWER_REPEATS), CITATION);
  await page.setViewportSize({ width: LAPTOP_WIDTH, height: SHORT_WINDOW_HEIGHT });
  await openDetail(page);
  await openBubble(page);
  await question(page).click();
  await expect(answer(page)).toContainText(ANSWER_TEXT, { timeout: NETWORK_TIMEOUT });

  const content = bubble(page).locator('[data-slot="ask-content"]');
  await expect
    .poll(() => content.evaluate((element): number => element.scrollHeight - element.clientHeight))
    .toBeLessThanOrEqual(NO_REQUESTS);
});

test('grows with a short answer instead of filling its maximum height', async ({ page }): Promise<void> => {
  await stubAnswer(page, ANSWER_TEXT, CITATION);
  await page.setViewportSize({ width: LAPTOP_WIDTH, height: WINDOW_HEIGHT });
  await openDetail(page);
  await openBubble(page);
  const before = await bubble(page).boundingBox();

  await question(page).click();
  await expect(answer(page)).toContainText(ANSWER_TEXT, { timeout: NETWORK_TIMEOUT });

  const maximum = await bubble(page)
    .locator('[data-slot="ask-content"]')
    .evaluate((element): number => parseFloat(getComputedStyle(element).maxHeight));
  const after = await bubble(page).boundingBox();
  expect(before?.height ?? 0).toBeLessThan(maximum);
  expect(after?.height ?? maximum).toBeLessThan(maximum);
});

test('closes with Escape, returns focus, and keeps the answer without asking again', async ({ page }): Promise<void> => {
  await stubAnswer(page, ANSWER_TEXT, CITATION);
  const streams = await countStreams(page);
  await openDetail(page);
  await openBubble(page);
  await question(page).click();
  await expect(answer(page)).toContainText(ANSWER_TEXT, { timeout: NETWORK_TIMEOUT });

  await page.keyboard.press('Escape');
  await expect(bubble(page)).toBeHidden();
  await expect(launcher(page)).toBeFocused();

  await openBubble(page);
  await expect(answer(page)).toContainText(ANSWER_TEXT);
  expect(streams()).toBe(ONE_SEARCH);
});

test('closes when clicking outside and returns focus to the Pokéball', async ({ page }): Promise<void> => {
  await openDetail(page);
  await openBubble(page);

  await page.locator('h1').click();

  await expect(bubble(page)).toBeHidden();
  await expect(launcher(page)).toBeFocused();
});

test('stays open when clicking inside the bubble', async ({ page }): Promise<void> => {
  await openDetail(page);
  await openBubble(page);
  const box = await bubble(page).boundingBox();

  await page.mouse.click((box?.x ?? 0) + INSIDE_OFFSET_PX, (box?.y ?? 0) + INSIDE_OFFSET_PX);

  await expect(bubble(page)).toBeVisible();
});

test('toggles closed from the Pokéball', async ({ page }): Promise<void> => {
  await openDetail(page);
  await openBubble(page);

  await launcher(page).click();

  await expect(bubble(page)).toBeHidden();
  await expect(launcher(page)).toHaveAttribute('aria-expanded', 'false');
});

test('offers no launcher for a Pokémon with no details yet', async ({ page }): Promise<void> => {
  await openDetail(page, 'Gecqua');
  await page.waitForTimeout(CHECK_WAIT_MS);

  await expect(launcher(page)).toHaveCount(NO_REQUESTS);
  await expect(page.getByRole('button', { name: /^Ask about/ })).toHaveCount(NO_REQUESTS);
});

test('stops the animations and still shows thinking when reduced motion is requested', async ({ page }): Promise<void> => {
  const release = await holdAnswer(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openDetail(page);

  const name = await launcher(page)
    .locator('img')
    .evaluate((image): string => getComputedStyle(image).animationName);
  expect(name).toBe('none');

  await openBubble(page);
  const pop = await bubble(page).evaluate((element): string => getComputedStyle(element).animationName);
  expect(pop).toBe('none');
  await question(page).click();
  await expect(bubble(page).locator('[data-slot="ask-thinking"]')).toBeVisible({ timeout: NETWORK_TIMEOUT });
  release();
});

test('animates the launcher when motion is allowed', async ({ page }): Promise<void> => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openDetail(page);

  const name = await launcher(page)
    .locator('img')
    .evaluate((image): string => getComputedStyle(image).animationName);
  expect(name).not.toBe('none');
});

for (const width of WIDTHS) {
  for (const height of WINDOW_HEIGHTS) {
    test(`shows the Pokéball at the card corner and keeps the bubble on screen at ${width}x${height}`, async ({ page }): Promise<void> => {
      await stubAnswer(page, `${ANSWER_TEXT} `.repeat(LONG_ANSWER_REPEATS), CITATION);
      await page.setViewportSize({ width, height });
      await openDetail(page);
      await expect(launcher(page)).toBeInViewport({ ratio: 1, timeout: NETWORK_TIMEOUT });

      const button = await launcher(page).boundingBox();
      const heading = await page.locator('h1').boundingBox();
      const card = await page.locator('main [data-slot="card"]').first().boundingBox();
      expect(button?.x ?? 0).toBeGreaterThanOrEqual(card?.x ?? width);
      expect((button?.x ?? 0) + (button?.width ?? 0)).toBeLessThanOrEqual((card?.x ?? 0) + (card?.width ?? 0));
      expect((card?.x ?? 0) + (card?.width ?? 0) - ((button?.x ?? 0) + (button?.width ?? 0))).toBeLessThanOrEqual(MAX_CORNER_INSET_PX);
      expect((button?.y ?? 0) - (card?.y ?? 0)).toBeLessThanOrEqual(MAX_CORNER_INSET_PX);
      expect(button?.x ?? 0).toBeGreaterThanOrEqual((heading?.x ?? 0) + (heading?.width ?? 0));

      await openBubble(page);
      await question(page).click();
      await expect(answer(page)).toContainText(ANSWER_TEXT, { timeout: NETWORK_TIMEOUT });
      const box = await bubble(page).boundingBox();
      expect(box?.x ?? -1).toBeGreaterThanOrEqual(NO_REQUESTS);
      expect(box?.y ?? -1).toBeGreaterThanOrEqual(NO_REQUESTS);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
      expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(height);
      await expect(backToQuestions(page)).toBeInViewport({ ratio: 1 });
      expect(await page.evaluate((): boolean => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    });
  }
}

test('keeps the bubble on screen after the page is scrolled', async ({ page }): Promise<void> => {
  await stubAnswer(page, `${ANSWER_TEXT} `.repeat(LONG_ANSWER_REPEATS), CITATION);
  await page.setViewportSize({ width: LAPTOP_WIDTH, height: SHORT_WINDOW_HEIGHT });
  await openDetail(page);
  await expect(launcher(page)).toBeVisible({ timeout: NETWORK_TIMEOUT });
  await launcher(page).evaluate((element): void => element.scrollIntoView({ block: 'end' }));

  await openBubble(page);
  await question(page).click();
  await expect(answer(page)).toContainText(ANSWER_TEXT, { timeout: NETWORK_TIMEOUT });

  const box = await bubble(page).boundingBox();
  expect(box?.y ?? -1).toBeGreaterThanOrEqual(NO_REQUESTS);
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(SHORT_WINDOW_HEIGHT);
});
