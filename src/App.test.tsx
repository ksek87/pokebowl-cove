import { render, screen } from '@testing-library/react';
import type { JSX, ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import { App } from './App.tsx';
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, SORT_OPTIONS, EXPANDED_FACETS_AT_LOAD } from './search/settings.ts';

vi.mock('@coveo/headless', async (importActual) => ({
  ...(await importActual<object>()),
  buildSearchEngine: vi.fn(() => ({ id: 'engine', subscribe: (): (() => void) => (): void => undefined, state: { query: { q: '' } } })),
}));

vi.mock('@coveo/atomic-react', () => {
  const passthrough = ({ children }: { children?: ReactNode }): JSX.Element => <>{children}</>;

  return {
    AtomicSearchInterface: passthrough,
    AtomicSearchLayout: passthrough,
    AtomicLayoutSection: passthrough,
    AtomicFacetManager: ({
      children,
      collapseFacetsAfter,
    }: {
      children?: ReactNode;
      collapseFacetsAfter: number;
    }): JSX.Element => (
      <div data-testid="facet-manager" data-collapse-after={collapseFacetsAfter}>
        {children}
      </div>
    ),
    AtomicFacet: ({
      field,
      label,
      sortCriteria,
    }: {
      field: string;
      label: string;
      sortCriteria: string;
    }): JSX.Element => <div data-testid={`facet-${field}`} data-label={label} data-sort={sortCriteria} />,
    AtomicSearchBox: (): null => null,
    AtomicQuerySummary: (): null => null,
    AtomicResultList: (): null => null,
    AtomicPager: (): null => null,
    AtomicBreadbox: (): null => null,
    AtomicDidYouMean: (): null => null,
    AtomicSortDropdown: passthrough,
    AtomicSortExpression: ({ label, expression }: { label: string; expression: string }): JSX.Element => (
      <span data-expression={expression}>{label}</span>
    ),
    AtomicResultsPerPage: ({
      choicesDisplayed,
      initialChoice,
    }: {
      choicesDisplayed: string;
      initialChoice: number;
    }): JSX.Element => <div data-testid="page-sizes" data-choices={choicesDisplayed} data-initial={initialChoice} />,
    AtomicRefineToggle: (): null => null,
    AtomicNoResults: (): null => null,
    AtomicQueryError: (): null => null,
  };
});

vi.mock('./search/PokedexLookupNotice.tsx', () => ({ PokedexLookupNotice: (): null => null }));

const config = { organizationId: 'test-org', searchApiKey: 'test-key' };

it('renders the application heading', (): void => {
  render(<App config={config} />);

  expect(screen.getByRole('heading', { name: 'Pokémon Search' })).toBeInTheDocument();
});

it('starts with the configured number of facets expanded', (): void => {
  render(<App config={config} />);

  expect(screen.getByTestId('facet-manager')).toHaveAttribute('data-collapse-after', String(EXPANDED_FACETS_AT_LOAD));
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

it('offers the configured page sizes through Atomic', (): void => {
  render(<App config={config} />);

  const pageSizes = screen.getByTestId('page-sizes');
  expect(pageSizes).toHaveAttribute('data-choices', PAGE_SIZES.join(','));
  expect(pageSizes).toHaveAttribute('data-initial', String(DEFAULT_PAGE_SIZE));
});

it('links the logo and title to the home page', (): void => {
  render(<App config={config} />);

  expect(screen.getByRole('link', { name: 'Go to the home page' })).toHaveAttribute('href', '/');
});

it.each(SORT_OPTIONS)('offers the $label sort with its expression', ({ label, expression }): void => {
  render(<App config={config} />);

  expect(screen.getByText(label)).toHaveAttribute('data-expression', expression);
});
