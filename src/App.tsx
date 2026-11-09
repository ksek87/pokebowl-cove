import {
  AtomicBreadbox,
  AtomicDidYouMean,
  AtomicFacet,
  AtomicFacetManager,
  AtomicLayoutSection,
  AtomicNoResults,
  AtomicPager,
  AtomicQueryError,
  AtomicQuerySummary,
  AtomicRefineToggle,
  AtomicResultList,
  AtomicResultsPerPage,
  AtomicSearchBox,
  AtomicSearchInterface,
  AtomicSearchLayout,
  AtomicSortDropdown,
  AtomicSortExpression,
} from '@coveo/atomic-react';
import { buildSearchEngine, type Result } from '@coveo/headless';
import { type CSSProperties, type JSX, useEffect, useMemo } from 'react';
import type { CoveoConfig } from './config.ts';
import { toEngineConfiguration } from './search/engine.ts';
import { showAllWhenCleared } from './search/showAllWhenCleared.ts';
import { POKEMON_RESULT_FIELDS, PokemonResult } from './search/PokemonResult.tsx';
import {
  DEFAULT_PAGE_SIZE,
  EXPANDED_FACETS_AT_LOAD,
  FACET_VALUE_LIMIT,
  PAGE_SIZES,
  POKEBALL_IMAGE,
  POKEMON_FIELDS,
  RESULT_COLUMNS,
  SORT_OPTIONS,
} from './search/settings.ts';
import { PokedexLookupNotice } from './search/PokedexLookupNotice.tsx';

const GRID_SETTINGS = {
  '--result-columns-narrow': RESULT_COLUMNS.narrow,
  '--result-columns-wide': RESULT_COLUMNS.wide,
} as CSSProperties;

function renderResult(result: Result): JSX.Element {
  return <PokemonResult result={result} />;
}

export function App({ config }: { config: CoveoConfig }): JSX.Element {
  const engine = useMemo(
    () => buildSearchEngine({ configuration: toEngineConfiguration(config) }),
    [config],
  );

  useEffect(() => showAllWhenCleared(engine), [engine]);

  return (
    <>
      <header className="flex flex-col items-center px-(--size-gutter) pt-10 pb-4 text-center">
        <a
          className="group flex items-center gap-3 rounded-2xl text-inherit no-underline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-ring"
          data-slot="home-link"
          href="/"
          aria-label="Go to the home page"
        >
          <img
            className="size-11 transition-transform duration-200 group-hover:-rotate-20 motion-reduce:transition-none motion-reduce:group-hover:rotate-0"
            src={POKEBALL_IMAGE}
            alt=""
          />
          <h1 className="text-5xl/14 font-black tracking-tight">Pokémon Search</h1>
        </a>
      </header>
      <main className="mx-auto min-h-screen max-w-(--size-content)" style={GRID_SETTINGS}>
        <AtomicSearchInterface engine={engine} fieldsToInclude={POKEMON_RESULT_FIELDS}>
          <AtomicSearchLayout>
            <AtomicLayoutSection section="search">
              <AtomicSearchBox />
            </AtomicLayoutSection>
            <AtomicLayoutSection section="facets">
              <AtomicFacetManager collapseFacetsAfter={EXPANDED_FACETS_AT_LOAD}>
                <AtomicFacet
                  field={POKEMON_FIELDS.type}
                  label="Type"
                  sortCriteria="alphanumeric"
                  numberOfValues={FACET_VALUE_LIMIT}
                  withSearch={false}
                />
                <AtomicFacet
                  field={POKEMON_FIELDS.generation}
                  label="Generation"
                  sortCriteria="alphanumericNatural"
                  numberOfValues={FACET_VALUE_LIMIT}
                  withSearch={false}
                />
              </AtomicFacetManager>
            </AtomicLayoutSection>
            <AtomicLayoutSection section="main">
              <AtomicLayoutSection section="status">
                <AtomicBreadbox />
              <PokedexLookupNotice engine={engine} />
              <AtomicDidYouMean />
                <AtomicQuerySummary />
              <AtomicSortDropdown>
                {SORT_OPTIONS.map(({ label, expression }) => (
                  <AtomicSortExpression key={label} label={label} expression={expression} />
                ))}
              </AtomicSortDropdown>
              <AtomicResultsPerPage
                choicesDisplayed={PAGE_SIZES.join(',')}
                initialChoice={DEFAULT_PAGE_SIZE}
              />
                <AtomicRefineToggle />
              </AtomicLayoutSection>
              <AtomicLayoutSection section="results">
                <AtomicResultList
                  display="grid"
                  imageSize="none"
                  template={renderResult}
                />
                <AtomicNoResults />
                <AtomicQueryError />
              </AtomicLayoutSection>
            </AtomicLayoutSection>
            <AtomicLayoutSection section="pagination">
              <AtomicPager />
            </AtomicLayoutSection>
          </AtomicSearchLayout>
        </AtomicSearchInterface>
      </main>
    </>
  );
}
