import type { SearchEngine } from '@coveo/headless';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { PokedexLookupNotice } from './PokedexLookupNotice.tsx';

function engineWith(q: string): SearchEngine {
  return {
    state: { query: { q } },
    subscribe: (): (() => void) => (): void => undefined,
  } as unknown as SearchEngine;
}

it('explains a number-only search', (): void => {
  render(<PokedexLookupNotice engine={engineWith('3')} />);

  expect(screen.getByRole('status')).toHaveTextContent('Showing Pokédex number #0003');
});

it('stays hidden for a text search', (): void => {
  render(<PokedexLookupNotice engine={engineWith('fire dragon')} />);

  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
