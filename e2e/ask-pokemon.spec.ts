import type { Locator, Page, Route } from '@playwright/test';
import { ASK_POKEMON_QUESTIONS, POKEMON_FIELDS } from '../src/search/settings.ts';
import { askPokemonQuestion, pokemonDetailHref } from '../src/search/pokemonDetail.ts';
import { ANSWER_STREAM_ROUTE, expect, fulfillNoAnswer, stubAnswer, test } from './fixtures.ts';

const NETWORK_TIMEOUT = 15_000;
const CHECK_WAIT_MS = 1_000;
const WINDOW_HEIGHT = 900;
const WIDTHS = [1100, 1440, 1920, 2560];
const ONE_SEARCH = 1;
const THREAD_TOP_TOLERANCE_PX = 24;
const NO_REQUESTS = 0;
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

function panel(page: Page): Locator {
  return page.getByRole('dialog', { name: LAUNCHER_NAME });
}

function suggestion(page: Page, text = FIRST_QUESTION): Locator {
  return panel(page).getByRole('button', { name: text });
}

function exchange(page: Page, text = FIRST_QUESTION): Locator {
  return panel(page).locator(`[data-slot="ask-exchange"][data-question="${text}"]`);
}

function answer(page: Page, text = FIRST_QUESTION): Locator {
  return exchange(page, text).locator('atomic-generated-answer [part~="container"]');
}

async function openChat(page: Page): Promise<void> {
  await launcher(page).click({ timeout: NETWORK_TIMEOUT });
  await expect(panel(page)).toBeVisible();
}

test('shows only the closed launcher and generates nothing on page load', async ({ page }): Promise<void> => {
  let streams = NO_REQUESTS;
  await page.route(ANSWER_STREAM_ROUTE, async (route): Promise<void> => {
    streams += ONE_SEARCH;
    await route.fallback();
  });
  await openDetail(page);

  await expect(launcher(page)).toBeVisible({ timeout: NETWORK_TIMEOUT });
  await expect(launcher(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(panel(page)).toHaveCount(NO_REQUESTS);
  await expect(page.locator('section[aria-label="Ask about this Pokémon"]')).toHaveCount(NO_REQUESTS);
  await page.waitForTimeout(CHECK_WAIT_MS);
  expect(streams).toBe(NO_REQUESTS);
});

test('opens with a greeting and every suggested question, still generating nothing', async ({ page }): Promise<void> => {
  let streams = NO_REQUESTS;
  await page.route(ANSWER_STREAM_ROUTE, async (route): Promise<void> => {
    streams += ONE_SEARCH;
    await route.fallback();
  });
  await openDetail(page);
  await openChat(page);

  await expect(launcher(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(panel(page).getByRole('heading', { name: LAUNCHER_NAME })).toBeVisible();
  await expect(panel(page)).toContainText(new RegExp(`know about ${NAME}`));
  for (const text of QUESTIONS) {
    await expect(suggestion(page, text)).toBeVisible();
  }
  await expect(suggestion(page)).toBeFocused();
  await expect(panel(page).getByRole('textbox')).toHaveCount(NO_REQUESTS);
  await page.waitForTimeout(CHECK_WAIT_MS);
  expect(streams).toBe(NO_REQUESTS);
});

test('scopes the question to this Pokémon and shows it with the answer and citation', async ({ page }): Promise<void> => {
  await stubAnswer(page, ANSWER_TEXT, CITATION);
  await openDetail(page);
  await openChat(page);
  const request = page.waitForRequest(
    (candidate): boolean =>
      isSearchRequest(candidate.url(), candidate.method()) &&
      (JSON.parse(candidate.postData() ?? '{}') as SearchBody).q === FIRST_QUESTION,
  );

  await suggestion(page).click();

  const body = JSON.parse((await request).postData() ?? '{}') as SearchBody;
  expect(body.aq).toBe(`@${POKEMON_FIELDS.name}=="${NAME}"`);
  await expect(exchange(page).locator('[data-slot="ask-question"]')).toHaveText(FIRST_QUESTION);
  await expect(answer(page)).toContainText(ANSWER_TEXT, { timeout: NETWORK_TIMEOUT });
  await expect(answer(page)).toContainText(/may contain errors/i);
  await expect(exchange(page).locator('atomic-generated-answer [part~="citation"]').first()).toHaveAttribute(
    'href',
    CITATION.clickUri,
  );
  await expect(exchange(page).locator('[data-slot="ask-status"]')).toContainText(/answer ready/i);
  await expect(page).not.toHaveURL(/#/);
});

test('shows the animated Pokéball until the answer starts', async ({ page }): Promise<void> => {
  let release: () => void = (): void => undefined;
  const released = new Promise<void>((resolve): void => {
    release = resolve;
  });
  await page.route(ANSWER_STREAM_ROUTE, async (route: Route): Promise<void> => {
    await released;
    await fulfillNoAnswer(route);
  });
  await openDetail(page);
  await openChat(page);

  await suggestion(page).click();

  const typing = exchange(page).locator('[data-slot="ask-typing"]');
  await expect(typing).toBeVisible({ timeout: NETWORK_TIMEOUT });
  await expect(exchange(page).locator('[data-slot="ask-status"]')).toContainText(/generating/i);
  const animation = await typing.locator('img').evaluate((image): string => getComputedStyle(image).animationName);
  expect(animation).not.toBe('none');
  release();
  await expect(typing).toHaveCount(NO_REQUESTS, { timeout: NETWORK_TIMEOUT });
});

test('says so in the thread when no answer comes back', async ({ page }): Promise<void> => {
  await openDetail(page);
  await openChat(page);

  await suggestion(page).click();

  await expect(exchange(page).locator('[data-slot="ask-message"]')).toContainText(/no answer/i, {
    timeout: NETWORK_TIMEOUT,
  });
  await expect(exchange(page).getByRole('button', { name: /try again/i })).toHaveCount(NO_REQUESTS);
});

test('offers a retry in the thread when the request fails', async ({ page }): Promise<void> => {
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
  await openChat(page);

  await suggestion(page).click();

  const retry = exchange(page).getByRole('button', { name: /try again/i });
  await expect(retry).toBeVisible({ timeout: NETWORK_TIMEOUT });
  shouldFail = false;
  await retry.click();
  await expect(answer(page)).toContainText(ANSWER_TEXT, { timeout: NETWORK_TIMEOUT });
  await expect(retry).toHaveCount(NO_REQUESTS);
});

test('keeps a thread and offers only the questions not yet asked', async ({ page }): Promise<void> => {
  await stubAnswer(page, ANSWER_TEXT, CITATION);
  await openDetail(page);
  await openChat(page);

  await suggestion(page).click();
  await expect(answer(page)).toContainText(ANSWER_TEXT, { timeout: NETWORK_TIMEOUT });
  await expect(panel(page).locator('[data-slot="ask-suggestions"]').getByRole('button')).toHaveCount(
    QUESTIONS.length - ONE_SEARCH,
  );
  await suggestion(page, SECOND_QUESTION).click();
  await expect(answer(page, SECOND_QUESTION)).toContainText(ANSWER_TEXT, { timeout: NETWORK_TIMEOUT });

  await expect(answer(page)).toContainText(ANSWER_TEXT);
  await expect(panel(page).locator('[data-slot="ask-exchange"]')).toHaveCount(QUESTIONS.length - ONE_SEARCH);
});

test('scrolls inside the panel, not the page, as the thread grows', async ({ page }): Promise<void> => {
  await stubAnswer(page, `${ANSWER_TEXT} `.repeat(60), CITATION);
  await page.setViewportSize({ width: 1440, height: WINDOW_HEIGHT });
  await openDetail(page);
  await openChat(page);
  const pageScrollBefore = await page.evaluate((): number => window.scrollY);

  for (const text of QUESTIONS) {
    await suggestion(page, text).click();
    await expect(answer(page, text)).toContainText(ANSWER_TEXT, { timeout: NETWORK_TIMEOUT });
  }

  const thread = panel(page).locator('[data-slot="ask-thread"]');
  const overflow = await thread.evaluate((element): number => element.scrollHeight - element.clientHeight);
  expect(overflow).toBeGreaterThan(NO_REQUESTS);
  expect(await page.evaluate((): number => window.scrollY)).toBe(pageScrollBefore);
});

test('brings each new question to the top of the thread so its answer reads from the start', async ({ page }): Promise<void> => {
  await stubAnswer(page, `${ANSWER_TEXT} `.repeat(60), CITATION);
  await page.setViewportSize({ width: 1440, height: WINDOW_HEIGHT });
  await openDetail(page);
  await openChat(page);

  for (const text of QUESTIONS.slice(0, ONE_SEARCH + ONE_SEARCH)) {
    await suggestion(page, text).click();
    await expect(answer(page, text)).toContainText(ANSWER_TEXT, { timeout: NETWORK_TIMEOUT });
  }

  const thread = await panel(page).locator('[data-slot="ask-thread"]').boundingBox();
  const latest = await exchange(page, SECOND_QUESTION).boundingBox();
  expect(Math.abs((latest?.y ?? 0) - (thread?.y ?? 0))).toBeLessThanOrEqual(THREAD_TOP_TOLERANCE_PX);
});

test('closes with the close button and Escape, returns focus, and keeps the thread', async ({ page }): Promise<void> => {
  await stubAnswer(page, ANSWER_TEXT, CITATION);
  await openDetail(page);
  await openChat(page);
  await suggestion(page).click();
  await expect(answer(page)).toContainText(ANSWER_TEXT, { timeout: NETWORK_TIMEOUT });

  await panel(page).getByRole('button', { name: 'Close' }).click();
  await expect(panel(page)).toBeHidden();
  await expect(launcher(page)).toBeFocused();

  await openChat(page);
  await expect(answer(page)).toContainText(ANSWER_TEXT);
  await page.keyboard.press('Escape');
  await expect(panel(page)).toBeHidden();
  await expect(launcher(page)).toBeFocused();
});

test('offers no launcher for a Pokémon with no details yet', async ({ page }): Promise<void> => {
  await openDetail(page, 'Gecqua');
  await page.waitForTimeout(CHECK_WAIT_MS);

  await expect(launcher(page)).toHaveCount(NO_REQUESTS);
  await expect(page.getByRole('button', { name: /^Ask about/ })).toHaveCount(NO_REQUESTS);
});

test('stops the Pokéball animations when reduced motion is requested', async ({ page }): Promise<void> => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openDetail(page);

  const name = await launcher(page)
    .locator('img')
    .evaluate((image): string => getComputedStyle(image).animationName);
  expect(name).toBe('none');
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
  test(`keeps the launcher clear of the content and the panel on screen at ${width}px`, async ({ page }): Promise<void> => {
    await page.setViewportSize({ width, height: WINDOW_HEIGHT });
    await openDetail(page);
    await expect(launcher(page)).toBeVisible({ timeout: NETWORK_TIMEOUT });

    const button = await launcher(page).boundingBox();
    const content = await page.locator('main [data-slot="card"]').first().boundingBox();
    expect(button?.x ?? 0).toBeGreaterThanOrEqual((content?.x ?? 0) + (content?.width ?? 0));

    await openChat(page);
    const box = await panel(page).boundingBox();
    expect(box?.x ?? -1).toBeGreaterThanOrEqual(NO_REQUESTS);
    expect(box?.y ?? -1).toBeGreaterThanOrEqual(NO_REQUESTS);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(WINDOW_HEIGHT);
    expect(box?.y ?? 0).toBeLessThan(button?.y ?? 0);
    expect(await page.evaluate((): boolean => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  });
}
