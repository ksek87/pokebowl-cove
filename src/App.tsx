import {
  AtomicBreadbox,
  AtomicDidYouMean,
  AtomicFacet,
  AtomicGeneratedAnswer,
  AtomicLayoutSection,
  AtomicPager,
  AtomicPopover,
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
import { POKEMON_RESULT_FIELDS, PokemonResult, PokemonResultLink } from './search/PokemonResult.tsx';
import {
  DEFAULT_PAGE_SIZE,
  FACET_VALUE_LIMIT,
  PAGE_SIZES,
  POKEMON_FIELDS,
  RESULT_COLUMNS,
  SORT_OPTIONS,
} from './search/settings.ts';
import { PokedexLookupNotice } from './search/PokedexLookupNotice.tsx';
import { ResultPlaceholders } from './search/LoadingPlaceholders.tsx';
import { SearchStateMessage } from './search/SearchStateMessage.tsx';
import { SiteHeader } from './search/SiteHeader.tsx';

const GRID_SETTINGS = {
  '--result-columns-narrow': RESULT_COLUMNS.narrow,
  '--result-columns-wide': RESULT_COLUMNS.wide,
} as CSSProperties;

function renderResult(result: Result): { contentTemplate: JSX.Element; linkTemplate: JSX.Element } {
  return { contentTemplate: <PokemonResult result={result} />, linkTemplate: <PokemonResultLink result={result} /> };
}

export function App({ config }: { config: CoveoConfig }): JSX.Element {
  const engine = useMemo(
    () => buildSearchEngine({ configuration: toEngineConfiguration(config) }),
    [config],
  );

  useEffect(() => showAllWhenCleared(engine), [engine]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-(--size-content) flex-1" style={GRID_SETTINGS}>
        <AtomicSearchInterface engine={engine} fieldsToInclude={POKEMON_RESULT_FIELDS}>
          <AtomicSearchLayout>
            <AtomicLayoutSection section="search">
              <AtomicSearchBox />
            </AtomicLayoutSection>
            <AtomicLayoutSection section="main">
              <AtomicLayoutSection section="horizontal-facets">
                <AtomicPopover>
                  <AtomicFacet
                    field={POKEMON_FIELDS.type}
                    label="Type"
                    sortCriteria="alphanumeric"
                    numberOfValues={FACET_VALUE_LIMIT}
                    withSearch={false}
                  />
                </AtomicPopover>
                <AtomicPopover>
                  <AtomicFacet
                    field={POKEMON_FIELDS.generation}
                    label="Generation"
                    sortCriteria="alphanumericNatural"
                    numberOfValues={FACET_VALUE_LIMIT}
                    withSearch={false}
                  />
                </AtomicPopover>
              </AtomicLayoutSection>
              <AtomicLayoutSection section="status">
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
                <AtomicDidYouMean />
                <PokedexLookupNotice engine={engine} />
                <AtomicBreadbox />
                <AtomicRefineToggle />
              </AtomicLayoutSection>
              <AtomicLayoutSection section="results">
                <AtomicGeneratedAnswer collapsible />
                <ResultPlaceholders />
                <AtomicResultList
                  display="grid"
                  imageSize="none"
                  template={renderResult}
                />
                <SearchStateMessage engine={engine} />
              </AtomicLayoutSection>
              <AtomicLayoutSection section="pagination">
                <AtomicPager />
              </AtomicLayoutSection>
            </AtomicLayoutSection>
          </AtomicSearchLayout>
        </AtomicSearchInterface>
      </main>
    </>
  );
}
