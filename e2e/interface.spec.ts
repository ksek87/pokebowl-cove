import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { DEFAULT_PAGE_SIZE } from '../src/search/settings.ts';

const NETWORK_TIMEOUT = 15_000;
const WINDOW_HEIGHT = 900;
const NARROW = 1100;
const LAPTOP = 1440;
const WIDE = 1920;
const LARGEST = 2560;
const ALL_WIDTHS = [NARROW, LAPTOP, WIDE, LARGEST];
const TOLERANCE_PX = 2;
const PANEL_BORDER_PX = 2;
const SEARCH_ROUTE = '**/rest/search/v2*';
const SLOW_RESPONSE_MS = 2_500;
const NEEDED_FOCUS_CONTRAST = 3;
const NEEDED_TEXT_CONTRAST = 4.5;
const CONTROL_SIZE_PX = 40;
const NO_GAP_PX = 0;
const LAYOUT_ROUNDING_PX = 1;
const ONE_STYLE = 1;
const MAX_ILLUSTRATION_PX = 140;
const MAX_LAYOUT_SHIFT = 0.05;
const MIN_FOCUS_WIDTH_PX = 2;
const TINY_PNG_WIDTH = 2;
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR4nGP4z8DwnwEIGGAMAB/yA/2tqmKwAAAAAElFTkSuQmCC',
  'base64',
);

interface Rgb { r: number; g: number; b: number }

function parseRgb(text: string): Rgb {
  const [r, g, b] = (text.match(/\d+(\.\d+)?/g) ?? []).map(Number);
  return { r, g, b };
}

function luminance({ r, g, b }: Rgb): number {
  const [red, green, blue] = [r, g, b].map((value): number => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: string, second: string): number {
  const [light, dark] = [luminance(parseRgb(first)), luminance(parseRgb(second))].sort((a, b): number => b - a);
  return (light + 0.05) / (dark + 0.05);
}

async function open(page: Page, width: number, path = '/'): Promise<void> {
  await page.setViewportSize({ width, height: WINDOW_HEIGHT });
  await page.route(/pokemondb\.net/, (route) => route.abort());
  await page.goto(path);
}

async function openResults(page: Page, width: number, path = '/'): Promise<void> {
  await open(page, width, path);
  await expect(page.locator('atomic-result').first()).toBeVisible({ timeout: NETWORK_TIMEOUT });
}

async function centerY(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error('Element is not visible');
  }
  return box.y + box.height / 2;
}

async function outlineOf(locator: Locator): Promise<{ style: string; width: number; color: string }> {
  return locator.evaluate((element) => {
    const { outlineStyle, outlineWidth, outlineColor } = getComputedStyle(element);
    return { style: outlineStyle, width: Number.parseFloat(outlineWidth), color: outlineColor };
  });
}

async function expectVisibleFocus(page: Page, locator: Locator): Promise<void> {
  await page.keyboard.press('Tab');
  await locator.focus();
  const outline = await outlineOf(locator);
  expect(outline.style).toBe('solid');
  expect(outline.width).toBeGreaterThanOrEqual(MIN_FOCUS_WIDTH_PX);
  const background = await page.evaluate((): string => getComputedStyle(document.body).backgroundColor);
  expect(contrast(outline.color, background)).toBeGreaterThanOrEqual(NEEDED_FOCUS_CONTRAST);
}

test.describe('focus', () => {
  test('is clearly visible on selected and unselected controls', async ({ page }): Promise<void> => {
    await openResults(page, LAPTOP, '/#q=fire');
    await expectVisibleFocus(page, page.locator('atomic-results-per-page [part~="active-button"]'));
    await expectVisibleFocus(page, page.locator('atomic-pager [part~="active-page-button"]'));
    await expectVisibleFocus(page, page.locator('atomic-sort-dropdown select'));
    await expectVisibleFocus(page, page.locator('atomic-search-box [part="clear-button"]'));
    await expectVisibleFocus(page, page.locator('atomic-search-box [part="submit-button"]'));
    await expectVisibleFocus(page, page.locator('atomic-facet [part="label-button"]').first());
    await expectVisibleFocus(page, page.locator('[data-slot="pokemon-card"] a').first());
    await expectVisibleFocus(page, page.locator('[data-slot="home-link"]'));
  });
});

test.describe('controls row', () => {
  for (const width of [NARROW, LAPTOP]) {
    test(`keeps sort and page size in place at ${width}px`, async ({ page }): Promise<void> => {
      const sort = page.locator('atomic-sort-dropdown select');
      const pageSize = page.locator('atomic-results-per-page [part~="active-button"]');
      await openResults(page, width);
      const expected = await centerY(sort);

      for (const hash of ['#q=charzard', '#q=25', '#f-pokemon_type=Fire']) {
        await page.goto(`/${hash}`);
        await page.reload();
        await expect(page.locator('atomic-result').first()).toBeVisible({ timeout: NETWORK_TIMEOUT });
        await expect(sort).toBeVisible();
        expect(Math.abs((await centerY(sort)) - expected)).toBeLessThanOrEqual(TOLERANCE_PX);
        expect(Math.abs((await centerY(pageSize)) - expected)).toBeLessThanOrEqual(TOLERANCE_PX);
      }
    });
  }

  test('puts the correction below the controls', async ({ page }): Promise<void> => {
    await openResults(page, LAPTOP, '/#q=charzard');
    const control = await page.locator('atomic-sort-dropdown select').boundingBox();
    const correction = await page.locator('atomic-did-you-mean').boundingBox();
    expect(correction?.y).toBeGreaterThanOrEqual((control?.y ?? 0) + (control?.height ?? 0));
  });

  test('keeps both controls on one row beside the summary at the narrowest width', async ({ page }): Promise<void> => {
    await openResults(page, NARROW, '/#q=fire');
    const sort = await page.locator('atomic-sort-dropdown').boundingBox();
    const sizes = await page.locator('atomic-results-per-page').boundingBox();
    const summary = await page.locator('atomic-query-summary').boundingBox();
    expect(sizes?.y).toBe(sort?.y);
    expect((summary?.x ?? 0) + (summary?.width ?? 0)).toBeLessThanOrEqual(sort?.x ?? 0);
  });

  test('uses one label style', async ({ page }): Promise<void> => {
    await openResults(page, LAPTOP);
    const read = (locator: Locator): Promise<string[]> =>
      locator.evaluate((element) => {
        const style = getComputedStyle(element);
        return [style.fontSize, style.fontWeight];
      });
    expect(await read(page.locator('atomic-results-per-page [part="label"]'))).toEqual(
      await read(page.locator('atomic-sort-dropdown label')),
    );
    const colon = await page.locator('atomic-results-per-page [part="label"]').evaluate(
      (element) => getComputedStyle(element, '::after').content,
    );
    expect(colon).toContain(':');
  });
});

test.describe('search box', () => {
  test('shows typed text in the main text color', async ({ page }): Promise<void> => {
    await openResults(page, LAPTOP);
    const input = page.locator('atomic-search-box textarea:not([part="textarea-spacer"])');
    const { color, weight } = await input.evaluate((element) => ({
      color: getComputedStyle(element).color,
      weight: Number(getComputedStyle(element).fontWeight),
    }));
    const foreground = await page.evaluate((): string => getComputedStyle(document.body).color);
    expect(color).toBe(foreground);
    expect(weight).toBeGreaterThan(400);
  });

  test('matches the suggestion panel to the search box', async ({ page }): Promise<void> => {
    await page.route('**/rest/search/v2/querySuggest*', (route) =>
      route.fulfill({
        json: { completions: [{ expression: 'charizard', highlighted: '[char]izard', score: 1, executableConfidence: 1 }] },
      }),
    );
    await openResults(page, LAPTOP);
    const input = page.locator('atomic-search-box textarea:not([part="textarea-spacer"])');
    await input.click();
    await input.pressSequentially('char');
    const panel = page.locator('atomic-search-box [part~="suggestions-wrapper"]');
    await expect(panel).toBeVisible({ timeout: NETWORK_TIMEOUT });

    const panelBox = await panel.boundingBox();
    const boxBox = await page.locator('atomic-search-box [part="wrapper"]').boundingBox();
    expect(Math.abs((panelBox?.x ?? 0) - (boxBox?.x ?? 0))).toBeLessThanOrEqual(TOLERANCE_PX);
    expect(Math.abs((panelBox?.width ?? 0) - (boxBox?.width ?? 0))).toBeLessThanOrEqual(TOLERANCE_PX);
    expect(panelBox?.y ?? 0).toBeGreaterThan((boxBox?.y ?? 0) + (boxBox?.height ?? 0));

    const styles = await panel.evaluate((element) => ({
      radius: getComputedStyle(element).borderTopLeftRadius,
      border: getComputedStyle(element).borderTopWidth,
    }));
    const boxRadius = await page.locator('atomic-search-box [part="wrapper"]').evaluate((element): string => getComputedStyle(element).borderTopLeftRadius);
    expect(styles.radius).toBe(boxRadius);
    expect(styles.border).toBe(`${PANEL_BORDER_PX}px`);

    const textColor = await page.locator('atomic-search-box [part~="query-suggestion-text"]').first().evaluate((element): string => getComputedStyle(element).color);
    const foreground = await page.evaluate((): string => getComputedStyle(document.body).color);
    expect(textColor).toBe(foreground);
  });

  test('has comfortable submit and clear targets', async ({ page }): Promise<void> => {
    await openResults(page, LAPTOP, '/#q=fire');
    for (const part of ['submit-button', 'clear-button']) {
      const box = await page.locator(`atomic-search-box [part="${part}"]`).boundingBox();
      expect(box?.width).toBe(CONTROL_SIZE_PX);
      expect(box?.height).toBe(CONTROL_SIZE_PX);
    }
  });
});

test('facet header hover stays readable', async ({ page }): Promise<void> => {
  await openResults(page, LAPTOP);
  const header = page.locator('atomic-facet [part="label-button"]').first();
  await header.hover();
  await expect
    .poll(async () => contrast(await header.evaluate((element) => getComputedStyle(element).color), 'rgb(255, 255, 255)'))
    .toBeGreaterThanOrEqual(NEEDED_TEXT_CONTRAST);
});

test.describe('page height', () => {
  for (const path of ['/#q=25', '/?pokemon=not-a-pokemon']) {
    test(`does not scroll needlessly on ${path}`, async ({ page }): Promise<void> => {
      await open(page, LAPTOP, path);
      await expect
        .poll(() => page.evaluate((): number => document.documentElement.scrollHeight - window.innerHeight), {
          timeout: NETWORK_TIMEOUT,
        })
        .toBeLessThanOrEqual(0);
    });
  }
});

test.describe('loading', () => {
  test('matches the real cards and reserves the facets', async ({ page }): Promise<void> => {
    await page.addInitScript((): void => {
      const target = window as unknown as { shift: number };
      target.shift = 0;
      new PerformanceObserver((list): void => {
        for (const entry of list.getEntries() as unknown as { value: number }[]) {
          target.shift += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.route(SEARCH_ROUTE, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, SLOW_RESPONSE_MS));
      await route.continue();
    });
    await open(page, LAPTOP);

    const placeholder = page.locator('[data-slot="result-placeholder"]');
    await expect(placeholder).toHaveCount(DEFAULT_PAGE_SIZE, { timeout: NETWORK_TIMEOUT });
    await expect(page.locator('[data-slot="facet-placeholder"]').first()).toBeVisible();
    const skeleton = await placeholder.first().boundingBox();
    const facet = await page.locator('[data-slot="facet-placeholder"]').first().boundingBox();
    const secondFacet = await page.locator('[data-slot="facet-placeholder"]').nth(1).boundingBox();

    await expect(page.locator('atomic-result').first()).toBeVisible({ timeout: NETWORK_TIMEOUT });
    await expect(placeholder.first()).toBeHidden();
    await page.waitForTimeout(SLOW_RESPONSE_MS / 2);

    const card = await page.locator('[data-slot="pokemon-card"]').first().boundingBox();
    const realFacet = await page.locator('atomic-facet').first().boundingBox();
    const realSecondFacet = await page.locator('atomic-facet').nth(1).boundingBox();
    expect(Math.abs((secondFacet?.y ?? 0) - (realSecondFacet?.y ?? 0))).toBeLessThanOrEqual(TOLERANCE_PX);
    expect(Math.abs((skeleton?.x ?? 0) - (card?.x ?? 0))).toBeLessThanOrEqual(TOLERANCE_PX);
    expect(Math.abs((skeleton?.y ?? 0) - (card?.y ?? 0))).toBeLessThanOrEqual(TOLERANCE_PX);
    expect(Math.abs((skeleton?.width ?? 0) - (card?.width ?? 0))).toBeLessThanOrEqual(TOLERANCE_PX);
    expect(Math.abs((skeleton?.height ?? 0) - (card?.height ?? 0))).toBeLessThanOrEqual(TOLERANCE_PX);
    expect(Math.abs((facet?.y ?? 0) - (realFacet?.y ?? 0))).toBeLessThanOrEqual(TOLERANCE_PX);
    expect(await page.evaluate((): number => (window as unknown as { shift: number }).shift)).toBeLessThan(MAX_LAYOUT_SHIFT);
  });
});

test.describe('designed states', () => {
  for (const width of ALL_WIDTHS) {
    test(`no results is designed and centered at ${width}px`, async ({ page }): Promise<void> => {
      await open(page, width, '/#q=9999');
      const message = page.locator('[data-slot="search-state"]');
      await expect(message).toContainText('No Pokémon found', { timeout: NETWORK_TIMEOUT });
      const box = await message.boundingBox();
      expect(Math.abs((box?.x ?? 0) + (box?.width ?? 0) / 2 - width / 2)).toBeLessThanOrEqual(TOLERANCE_PX);
      const image = await message.locator('img').boundingBox();
      expect(image?.height).toBeLessThanOrEqual(MAX_ILLUSTRATION_PX);
    });
  }

  test('a number that does not exist says so, and show all recovers', async ({ page }): Promise<void> => {
    await open(page, LAPTOP, '/#q=9999');
    const message = page.locator('[data-slot="search-state"]');
    await expect(message).toContainText('There is no Pokémon with Pokédex number #9999', { timeout: NETWORK_TIMEOUT });

    await message.getByRole('button', { name: 'Show all Pokémon' }).click();

    await expect(page.locator('atomic-result').first().getByRole('link', { name: 'Bulbasaur' })).toBeVisible({
      timeout: NETWORK_TIMEOUT,
    });
    await expect(page).not.toHaveURL(/q=9999/);
  });

  test('an error hides technical detail, and try again recovers', async ({ page }): Promise<void> => {
    await page.route(SEARCH_ROUTE, (route) => route.abort());
    await open(page, LAPTOP);
    const message = page.locator('[data-slot="search-state"]');
    await expect(message).toContainText('Try again', { timeout: NETWORK_TIMEOUT });
    await expect(page.locator('body')).not.toContainText('coveo.com');
    await expect(page.getByText('No access')).toHaveCount(0);

    await page.unroute(SEARCH_ROUTE);
    await message.getByRole('button', { name: 'Try again' }).click();

    await expect(page.locator('atomic-result').first()).toBeVisible({ timeout: NETWORK_TIMEOUT });
    await expect(page.locator('atomic-sort-dropdown select')).toBeVisible();
  });
});

test.describe('detail page', () => {
  test('uses the Pokémon name as the main heading and shared controls', async ({ page }): Promise<void> => {
    await open(page, LAPTOP, '/?pokemon=Charizard');
    await expect(page.getByRole('heading', { level: 1, name: 'Charizard' })).toBeVisible({ timeout: NETWORK_TIMEOUT });
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 2, name: 'Base stats' })).toBeVisible();
    const back = page.getByRole('link', { name: 'Back to search' });
    const style = await back.evaluate((element) => {
      const { height, borderTopWidth, boxShadow } = getComputedStyle(element);
      return { height, borderTopWidth, boxShadow };
    });
    expect(style).toMatchObject({ height: `${CONTROL_SIZE_PX}px`, borderTopWidth: '2px' });
    expect(style.boxShadow).not.toMatch(/\b[1-9]\d*px/);
  });

  test('does not expose stat bars as progress', async ({ page }): Promise<void> => {
    await open(page, LAPTOP, '/?pokemon=Charizard');
    await expect(page.getByRole('heading', { level: 1, name: 'Charizard' })).toBeVisible({ timeout: NETWORK_TIMEOUT });
    await expect(page.getByRole('progressbar')).toHaveCount(0);
  });

  test('does not enlarge artwork past its natural size', async ({ page }): Promise<void> => {
    await page.setViewportSize({ width: LAPTOP, height: WINDOW_HEIGHT });
    await page.route(/img\.pokemondb\.net/, (route) => route.fulfill({ contentType: 'image/png', body: TINY_PNG }));
    await page.goto('/?pokemon=Charizard');
    const image = page.locator('[data-slot="pokemon-image"]');
    await expect(image).toBeVisible({ timeout: NETWORK_TIMEOUT });
    await expect.poll(async () => (await image.boundingBox())?.width).toBeLessThanOrEqual(TINY_PNG_WIDTH);
  });

  test('shows a card-shaped placeholder and announces loading', async ({ page }): Promise<void> => {
    await page.route(SEARCH_ROUTE, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, SLOW_RESPONSE_MS));
      await route.continue();
    });
    await open(page, LAPTOP, '/?pokemon=Charizard');
    await expect(page.locator('[data-slot="detail-placeholder"]')).toBeVisible({ timeout: NETWORK_TIMEOUT });
    await expect(page.getByRole('status')).toContainText('Loading');
  });

  test('offers a retry when loading fails', async ({ page }): Promise<void> => {
    await page.route(SEARCH_ROUTE, (route) => route.abort());
    await open(page, LAPTOP, '/?pokemon=Charizard');
    const retry = page.getByRole('button', { name: 'Try again' });
    await expect(retry).toBeVisible({ timeout: NETWORK_TIMEOUT });

    await page.unroute(SEARCH_ROUTE);
    await retry.click();

    await expect(page.getByRole('heading', { level: 1, name: 'Charizard' })).toBeVisible({ timeout: NETWORK_TIMEOUT });
  });
});

test.describe('motion', () => {
  test('lifts a hovered card without moving the layout', async ({ page }): Promise<void> => {
    await openResults(page, LAPTOP);
    const card = page.locator('[data-slot="pokemon-card"]').first();
    const second = page.locator('[data-slot="pokemon-card"]').nth(1);
    const before = await second.boundingBox();
    await card.hover();
    await expect.poll(() => card.evaluate((element) => getComputedStyle(element).translate)).not.toBe('none');
    expect(await second.boundingBox()).toEqual(before);
  });

  test('results and controls animate gently', async ({ page }): Promise<void> => {
    await openResults(page, LAPTOP);
    const name = await page.locator('atomic-result-list [part~="outline"]').first().evaluate(
      (element) => getComputedStyle(element).animationName,
    );
    expect(name).not.toBe('none');
    const duration = await page.locator('atomic-pager [part~="page-button"]').first().evaluate(
      (element) => getComputedStyle(element).transitionDuration,
    );
    expect(Number.parseFloat(duration)).toBeGreaterThan(0);
  });

  test('stops when reduced motion is requested', async ({ page }): Promise<void> => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openResults(page, LAPTOP);
    const name = await page.locator('atomic-result-list [part~="outline"]').first().evaluate(
      (element) => getComputedStyle(element).animationName,
    );
    expect(name).toBe('none');
  });
});

interface StatusRowLayout {
  labelGaps: number[];
  groupGap: number;
  centers: number[];
  heights: number[];
  rightEdge: number;
  gridRightEdge: number;
  labelStyles: string[];
  tokens: { label: number; group: number };
}

function readStatusRow(page: Page): Promise<StatusRowLayout> {
  return page.evaluate((): StatusRowLayout => {
    const sort = document.querySelector('atomic-sort-dropdown') as HTMLElement;
    const sizes = document.querySelector('atomic-results-per-page') as HTMLElement;
    const part = (host: HTMLElement, name: string): HTMLElement[] => [
      ...(host.shadowRoot ?? host).querySelectorAll<HTMLElement>(`[part~="${name}"]`),
    ];
    const box = (element: HTMLElement): DOMRect => element.getBoundingClientRect();
    const [sortLabel] = part(sort, 'label');
    const [select] = part(sort, 'select');
    const [sizeLabel] = part(sizes, 'label');
    const buttons = [...part(sizes, 'button'), ...part(sizes, 'active-button')].sort(
      (first, second): number => box(first).left - box(second).left,
    );
    const [firstButton] = buttons;
    const controls = [select, ...buttons];
    const token = (name: string): number =>
      Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
    const style = (label: HTMLElement): string => {
      const { fontSize, fontWeight, color } = getComputedStyle(label);
      return [fontSize, fontWeight, color].join(' ');
    };
    return {
      labelGaps: [box(select).left - box(sortLabel).right, box(firstButton).left - box(sizeLabel).right],
      groupGap: box(sizes).left - box(sort).right,
      centers: [sortLabel, sizeLabel, ...controls].map((item): number => box(item).top + box(item).height / 2),
      heights: controls.map((item): number => box(item).height),
      rightEdge: box(sizes).right,
      gridRightEdge: box(document.querySelector('atomic-result-list') as HTMLElement).right,
      labelStyles: [style(sortLabel), style(sizeLabel)],
      tokens: { label: token('--space-control-label'), group: token('--space-control-group') },
    };
  });
}

for (const width of ALL_WIDTHS) {
  for (const path of ['/', '/#q=fire']) {
    test(`spaces the sort and page-size controls evenly at ${width}px on ${path}`, async ({ page }): Promise<void> => {
      await page.setViewportSize({ width, height: WINDOW_HEIGHT });
      await page.goto(path);
      await expect(page.locator('atomic-result').first()).toBeVisible({ timeout: NETWORK_TIMEOUT });

      const row = await readStatusRow(page);

      expect(row.tokens.label).toBeGreaterThan(NO_GAP_PX);
      expect(row.tokens.group).toBeGreaterThan(row.tokens.label);
      for (const gap of row.labelGaps) {
        expect(Math.abs(gap - row.tokens.label)).toBeLessThanOrEqual(LAYOUT_ROUNDING_PX);
      }
      expect(Math.abs(row.groupGap - row.tokens.group)).toBeLessThanOrEqual(LAYOUT_ROUNDING_PX);
      expect(new Set(row.heights)).toEqual(new Set([CONTROL_SIZE_PX]));
      expect(Math.max(...row.centers) - Math.min(...row.centers)).toBeLessThanOrEqual(LAYOUT_ROUNDING_PX);
      expect(Math.abs(row.rightEdge - row.gridRightEdge)).toBeLessThanOrEqual(LAYOUT_ROUNDING_PX);
      expect(new Set(row.labelStyles).size).toBe(ONE_STYLE);
    });
  }
}
