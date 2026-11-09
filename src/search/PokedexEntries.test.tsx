import type { Result, SearchEngine } from '@coveo/headless';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PokedexEntries } from './PokedexEntries.tsx';
import { POKEDEX_ENTRIES_TIMEOUT_MS } from './settings.ts';

const quickview = vi.hoisted(() => ({
  state: { content: '', isLoading: true },
  fetchResultContent: vi.fn(),
  subscribe: vi.fn(),
}));

vi.mock('@coveo/headless', () => ({ buildQuickview: (): typeof quickview => quickview }));

const SOURCE = 'https://example.test/source';
const engine = {} as SearchEngine;
const result = { uniqueId: 'id', hasHtmlVersion: true } as unknown as Result;
const HTML =
  '<script>window.injected = true</script><h2>Pokédex entries</h2><h3>Testmon</h3><table>' +
  '<tr><th><span class="igame">Red</span></th><td class="cell-med-text">Older text.</td></tr>' +
  '<tr><th><span class="igame">Scarlet</span></th><td class="cell-med-text">Newest text.</td></tr></table>';

function finish(content: string): void {
  quickview.state = { content, isLoading: false };
  const [[notify]] = quickview.subscribe.mock.calls as [[() => void]];
  act(notify);
}

beforeEach((): void => {
  quickview.state = { content: '', isLoading: true };
  quickview.fetchResultContent.mockClear();
  quickview.subscribe.mockReset().mockReturnValue((): void => undefined);
});

afterEach((): void => {
  vi.useRealTimers();
});

it('requests the page content and shows a placeholder meanwhile', (): void => {
  const { container } = render(<PokedexEntries engine={engine} result={result} sourceUrl={SOURCE} />);

  expect(quickview.fetchResultContent).toHaveBeenCalled();
  expect(container.querySelector('[data-slot="pokedex-placeholder"]')).toBeInTheDocument();
});

it('shows the lead entry, its game and a credit to the source', (): void => {
  render(<PokedexEntries engine={engine} result={result} sourceUrl={SOURCE} />);
  finish(HTML);

  expect(screen.getByText('Newest text.')).toBeInTheDocument();
  expect(screen.getByText('Scarlet')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Pokémon Database' })).toHaveAttribute('href', SOURCE);
  expect(screen.getByText(/More entries/)).toBeInTheDocument();
});

it('never inserts markup from the page', (): void => {
  const { container } = render(<PokedexEntries engine={engine} result={result} sourceUrl={SOURCE} />);
  finish(HTML);

  expect(container.querySelector('script')).toBeNull();
});

it('hides itself when the page has no entries', (): void => {
  const { container } = render(<PokedexEntries engine={engine} result={result} sourceUrl={SOURCE} />);
  finish('<h2>Base stats</h2>');

  expect(container).toBeEmptyDOMElement();
});

it('hides itself when the item has no stored page', (): void => {
  const { container } = render(
    <PokedexEntries engine={engine} result={{ ...result, hasHtmlVersion: false } as Result} sourceUrl={SOURCE} />,
  );

  expect(container).toBeEmptyDOMElement();
  expect(quickview.fetchResultContent).not.toHaveBeenCalled();
});

it('hides itself when the content never arrives', (): void => {
  vi.useFakeTimers();
  const { container } = render(<PokedexEntries engine={engine} result={result} sourceUrl={SOURCE} />);

  act((): void => {
    vi.advanceTimersByTime(POKEDEX_ENTRIES_TIMEOUT_MS);
  });

  expect(container).toBeEmptyDOMElement();
});
