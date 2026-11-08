import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('@coveo/headless', () => ({
  buildSearchEngine: vi.fn(() => ({ id: 'engine' })),
}));

vi.mock('@coveo/atomic-react', () => {
  const passthrough = ({ children }: { children?: ReactNode }) => <>{children}</>;

  return {
    AtomicSearchInterface: ({ children }: { children?: ReactNode }) => (
      <div data-testid="search-interface">{children}</div>
    ),
    AtomicSearchLayout: passthrough,
    AtomicLayoutSection: passthrough,
    AtomicFacetManager: passthrough,
    AtomicFacet: ({
      field,
      label,
      sortCriteria,
    }: {
      field: string;
      label: string;
      sortCriteria: string;
    }) => <div data-testid={`facet-${field}`} data-label={label} data-sort={sortCriteria} />,
    AtomicSearchBox: () => <input aria-label="Search" />,
    AtomicQuerySummary: () => null,
    AtomicResultList: () => <div data-testid="result-list" />,
    AtomicNoResults: () => null,
    AtomicQueryError: () => null,
  };
});

const config = { organizationId: 'test-org', searchApiKey: 'test-key' };

it('renders the application heading', () => {
  render(<App config={config} />);

  expect(screen.getByRole('heading', { name: 'Pokémon Search' })).toBeInTheDocument();
});

it('renders a search box and results inside the search interface', () => {
  render(<App config={config} />);

  const searchInterface = screen.getByTestId('search-interface');
  expect(searchInterface).toContainElement(screen.getByRole('textbox', { name: 'Search' }));
  expect(searchInterface).toContainElement(screen.getByTestId('result-list'));
});

it('offers a Type facet', () => {
  render(<App config={config} />);

  const facet = screen.getByTestId('facet-pokemon_type');
  expect(facet).toHaveAttribute('data-label', 'Type');
  expect(facet).toHaveAttribute('data-sort', 'alphanumeric');
});

it('sorts the Generation facet naturally so Generation 10 follows Generation 9', () => {
  render(<App config={config} />);

  const facet = screen.getByTestId('facet-pokemon_generation');
  expect(facet).toHaveAttribute('data-label', 'Generation');
  expect(facet).toHaveAttribute('data-sort', 'alphanumericNatural');
});
