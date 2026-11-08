import { render, screen } from '@testing-library/react';
import type { JSX, ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import { App } from './App.tsx';

vi.mock('@coveo/headless', () => ({
  buildSearchEngine: vi.fn(() => ({ id: 'engine', subscribe: (): (() => void) => (): void => undefined, state: { query: { q: '' } } })),
}));

vi.mock('@coveo/atomic-react', () => {
  const passthrough = ({ children }: { children?: ReactNode }): JSX.Element => <>{children}</>;

  return {
    AtomicSearchInterface: ({ children }: { children?: ReactNode }): JSX.Element => (
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
    }): JSX.Element => <div data-testid={`facet-${field}`} data-label={label} data-sort={sortCriteria} />,
    AtomicSearchBox: (): JSX.Element => <input aria-label="Search" />,
    AtomicQuerySummary: (): null => null,
    AtomicResultList: (): JSX.Element => <div data-testid="result-list" />,
    AtomicPager: (): JSX.Element => <nav aria-label="Pagination" />,
    AtomicBreadbox: (): null => null,
    AtomicDidYouMean: (): JSX.Element => <div data-testid="did-you-mean" />,
    AtomicSortDropdown: ({ children }: { children?: ReactNode }): JSX.Element => <>{children}</>,
    AtomicSortExpression: ({ label }: { label: string }): JSX.Element => <span>{label}</span>,
    AtomicRefineToggle: (): null => null,
    AtomicNoResults: (): null => null,
    AtomicQueryError: (): null => null,
  };
});

vi.mock('./search/ResultsPerPage.tsx', () => ({
  ResultsPerPage: (): JSX.Element => <input aria-label="Results per page" />,
}));

const config = { organizationId: 'test-org', searchApiKey: 'test-key' };

it('renders the application heading', (): void => {
  render(<App config={config} />);

  expect(screen.getByRole('heading', { name: 'Pokémon Search' })).toBeInTheDocument();
});

it('renders a search box and results inside the search interface', (): void => {
  render(<App config={config} />);

  const searchInterface = screen.getByTestId('search-interface');
  expect(searchInterface).toContainElement(screen.getByRole('textbox', { name: 'Search' }));
  expect(searchInterface).toContainElement(screen.getByTestId('result-list'));
});

it('offers a Type facet', (): void => {
  render(<App config={config} />);

  const facet = screen.getByTestId('facet-pokemon_type');
  expect(facet).toHaveAttribute('data-label', 'Type');
  expect(facet).toHaveAttribute('data-sort', 'alphanumeric');
});

it('sorts the Generation facet naturally so Generation 10 follows Generation 9', (): void => {
  render(<App config={config} />);

  const facet = screen.getByTestId('facet-pokemon_generation');
  expect(facet).toHaveAttribute('data-label', 'Generation');
  expect(facet).toHaveAttribute('data-sort', 'alphanumericNatural');
});

it('lets people page through all results', (): void => {
  render(<App config={config} />);

  expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
});

it('lets people choose how many results to show', (): void => {
  render(<App config={config} />);

  expect(screen.getByRole('textbox', { name: 'Results per page' })).toBeInTheDocument();
});

it('links the logo and title to the home page', (): void => {
  render(<App config={config} />);

  expect(screen.getByRole('link', { name: 'Go to the home page' })).toHaveAttribute('href', '/');
});

it('offers query correction and sort options', (): void => {
  render(<App config={config} />);

  expect(screen.getByTestId('did-you-mean')).toBeInTheDocument();
  expect(screen.getByText('Best match')).toBeInTheDocument();
  expect(screen.getByText('Pokédex number')).toBeInTheDocument();
  expect(screen.getByText('Name A to Z')).toBeInTheDocument();
});
