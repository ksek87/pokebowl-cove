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
import { AnswerPlaceholder, ResultPlaceholders } from './search/LoadingPlaceholders.tsx';
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
          {/* Atomic's optional search section aligns the box with the results, so the box is centered in our markup instead. */}
          <div
            data-slot="search-row"
            className="mx-auto my-(--atomic-layout-spacing-y) min-h-(--size-search-row) w-full max-w-(--size-search)"
          >
            <AtomicSearchBox />
          </div>
          <AtomicSearchLayout>
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
              {/* Atomic's status section is a fixed grid with no place for page sizes, so this row is our markup. */}
              <div
                data-slot="status-row"
                className="mb-(--space-status-row) flex min-h-(--size-status-row) flex-wrap items-center gap-x-(--space-control-group) gap-y-(--space-status-row)"
              >
                {/* A zero basis lets the summary wrap, so a long query cannot push the controls to a second row. */}
                <AtomicQuerySummary className="min-w-0 flex-1" />
                <AtomicSortDropdown className="max-lg:hidden">
                  {SORT_OPTIONS.map(({ label, expression }) => (
                    <AtomicSortExpression key={label} label={label} expression={expression} />
                  ))}
                </AtomicSortDropdown>
                <AtomicResultsPerPage
                  choicesDisplayed={PAGE_SIZES.join(',')}
                  initialChoice={DEFAULT_PAGE_SIZE}
                />
                <AtomicDidYouMean className="basis-full" />
                <PokedexLookupNotice engine={engine} />
                <AtomicBreadbox className="basis-full" />
                {/* Below Tailwind's lg breakpoint, Atomic's default mobile breakpoint of 1024px, sorting and facets move into this modal. */}
                <AtomicRefineToggle className="lg:hidden" />
              </div>
              <AtomicLayoutSection section="results">
                <AnswerPlaceholder engine={engine} />
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
