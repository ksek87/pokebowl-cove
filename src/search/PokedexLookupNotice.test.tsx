import type { SearchEngine } from '@coveo/headless';
import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { PokedexLookupNotice } from './PokedexLookupNotice.tsx';

const status = vi.hoisted(() => ({ hasResults: true, hasError: false }));

vi.mock('@coveo/headless', async (importActual) => ({
  ...(await importActual<object>()),
  buildSearchStatus: (): object => ({ state: status, subscribe: (): (() => void) => (): void => undefined }),
}));

function engineWith(q: string): SearchEngine {
  return {
    state: { query: { q } },
    subscribe: (): (() => void) => (): void => undefined,
  } as unknown as SearchEngine;
}

beforeEach((): void => {
  status.hasResults = true;
  status.hasError = false;
});

it('explains a number-only search in one short sentence', (): void => {
  render(<PokedexLookupNotice engine={engineWith('3')} />);

  expect(screen.getByRole('status')).toHaveTextContent(/^Pokédex lookup\s*Showing #0003\. Use words to search descriptions\.$/);
});

it('stays hidden for a text search', (): void => {
  render(<PokedexLookupNotice engine={engineWith('fire dragon')} />);

  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('stays hidden when the number matches nothing', (): void => {
  status.hasResults = false;
  render(<PokedexLookupNotice engine={engineWith('9999')} />);

  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('stays hidden when the search failed', (): void => {
  status.hasError = true;
  render(<PokedexLookupNotice engine={engineWith('3')} />);

  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
