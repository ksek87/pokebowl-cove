import type { SearchEngine } from '@coveo/headless';
import { expect, it, type Mock, vi } from 'vitest';
import { showAllWhenCleared } from './showAllWhenCleared.ts';

vi.mock('@coveo/headless', () => ({
  loadQueryActions: (): object => ({ updateQuery: (payload: unknown): object => ({ updateQuery: payload }) }),
  loadSearchActions: (): object => ({ executeSearch: (action: unknown): object => ({ executeSearch: action }) }),
  loadSearchAnalyticsActions: (): object => ({ logSearchboxSubmit: (): string => 'submit' }),
}));

function engineWith(q: string, boxText: string): { dispatch: Mock } {
  const engine = {
    state: { query: { q }, querySet: { box: boxText } },
    dispatch: vi.fn(),
    subscribe: vi.fn(),
  };
  showAllWhenCleared(engine as unknown as SearchEngine);
  const [[notify]] = engine.subscribe.mock.calls as [[() => void]];
  notify();
  return engine;
}

it('searches for everything when the box is emptied after a search', (): void => {
  const engine = engineWith('charizard', '');

  expect(engine.dispatch).toHaveBeenCalledWith({ updateQuery: { q: '' } });
  expect(engine.dispatch).toHaveBeenCalledWith({ executeSearch: 'submit' });
});

it('does nothing while the person is still typing', (): void => {
  expect(engineWith('charizard', 'char').dispatch).not.toHaveBeenCalled();
});

it('does nothing when no search is showing', (): void => {
  expect(engineWith('', '').dispatch).not.toHaveBeenCalled();
});
