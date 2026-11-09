import type { SearchEngine } from '@coveo/headless';
import { afterEach, expect, it, type Mock, vi } from 'vitest';
import { showAllWhenCleared } from './showAllWhenCleared.ts';

vi.mock('@coveo/headless', () => ({
  loadPaginationActions: (): object => ({ updatePage: (page: unknown): object => ({ updatePage: page }) }),
  loadQueryActions: (): object => ({ updateQuery: (payload: unknown): object => ({ updateQuery: payload }) }),
  loadSearchActions: (): object => ({ executeSearch: (action: unknown): object => ({ executeSearch: action }) }),
  loadSearchAnalyticsActions: (): object => ({ logSearchboxSubmit: (): string => 'submit' }),
}));

const FIRST_PAGE = 1;
let stop: () => void = (): void => undefined;

function addButton(hostTag: string, part: string): HTMLElement {
  const host = document.body.appendChild(document.createElement(hostTag));
  const button = document.createElement('button');
  button.setAttribute('part', part);
  host.attachShadow({ mode: 'open' }).appendChild(button);
  return button;
}

function click(element: HTMLElement): void {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
}

function watch(q: string): { dispatch: Mock } {
  const engine = { state: { query: { q } }, dispatch: vi.fn() };
  stop = showAllWhenCleared(engine as unknown as SearchEngine);
  return engine;
}

afterEach((): void => {
  stop();
  document.body.replaceChildren();
});

it('searches for everything from the first page when the clear button is used', (): void => {
  const engine = watch('charizard');

  click(addButton('atomic-search-box', 'clear-button'));

  expect(engine.dispatch.mock.calls.map(([action]) => action)).toEqual([
    { updateQuery: { q: '' } },
    { updatePage: FIRST_PAGE },
    { executeSearch: 'submit' },
  ]);
});

it('ignores other buttons in the search box', (): void => {
  const engine = watch('charizard');

  click(addButton('atomic-search-box', 'submit-button'));

  expect(engine.dispatch).not.toHaveBeenCalled();
});

it('ignores clear buttons in other components', (): void => {
  const engine = watch('charizard');

  click(addButton('atomic-facet', 'clear-button'));

  expect(engine.dispatch).not.toHaveBeenCalled();
});

it('does nothing when no search is showing', (): void => {
  const engine = watch('');

  click(addButton('atomic-search-box', 'clear-button'));

  expect(engine.dispatch).not.toHaveBeenCalled();
});

it('stops listening when cleaned up', (): void => {
  const engine = watch('charizard');
  stop();

  click(addButton('atomic-search-box', 'clear-button'));

  expect(engine.dispatch).not.toHaveBeenCalled();
});
