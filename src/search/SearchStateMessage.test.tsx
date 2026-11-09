import type { SearchEngine } from '@coveo/headless';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { SearchStateMessage } from './SearchStateMessage.tsx';

const status = vi.hoisted(() => ({ firstSearchExecuted: true, isLoading: false, hasResults: false, hasError: false }));
const actions = vi.hoisted(() => ({ showAll: vi.fn(), retrySearch: vi.fn() }));

vi.mock('@coveo/headless', async (importActual) => ({
  ...(await importActual<object>()),
  buildSearchStatus: (): object => ({ state: status, subscribe: (): (() => void) => (): void => undefined }),
}));
vi.mock('./showAllWhenCleared.ts', () => actions);

function engineWith(q: string): SearchEngine {
  return { state: { query: { q } }, subscribe: (): (() => void) => (): void => undefined } as unknown as SearchEngine;
}

beforeEach((): void => {
  Object.assign(status, { firstSearchExecuted: true, isLoading: false, hasResults: false, hasError: false });
  actions.showAll.mockClear();
  actions.retrySearch.mockClear();
});

it('names the search that found nothing', (): void => {
  render(<SearchStateMessage engine={engineWith('zzz')} />);

  expect(screen.getByRole('status')).toHaveTextContent('No Pokémon found');
  expect(screen.getByRole('status')).toHaveTextContent('zzz');
});

it('explains a number that does not exist', (): void => {
  render(<SearchStateMessage engine={engineWith('9999')} />);

  expect(screen.getByRole('status')).toHaveTextContent('There is no Pokémon with Pokédex number #9999');
});

it('shows everything, without any filters, from the no-results action', (): void => {
  const engine = engineWith('zzz');
  render(<SearchStateMessage engine={engine} />);

  fireEvent.click(screen.getByRole('button', { name: 'Show all Pokémon' }));

  expect(actions.showAll).toHaveBeenCalledWith(engine, { clearFilters: true });
});

it('offers a retry on error and shows no technical detail', (): void => {
  status.hasError = true;
  const engine = engineWith('zzz');
  render(<SearchStateMessage engine={engine} />);

  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

  expect(actions.retrySearch).toHaveBeenCalledWith(engine);
  expect(screen.getByRole('status')).not.toHaveTextContent('coveo');
});

it.each([
  ['results are showing', { hasResults: true }],
  ['a search is running', { isLoading: true }],
  ['no search has finished', { firstSearchExecuted: false }],
])('stays empty while %s', (_name, nextStatus): void => {
  Object.assign(status, nextStatus);
  render(<SearchStateMessage engine={engineWith('zzz')} />);

  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
