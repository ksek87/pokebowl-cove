import {
  AtomicFacet,
  AtomicFacetManager,
  AtomicLayoutSection,
  AtomicNoResults,
  AtomicQueryError,
  AtomicQuerySummary,
  AtomicResultList,
  AtomicSearchBox,
  AtomicSearchInterface,
  AtomicSearchLayout,
} from '@coveo/atomic-react';
import { buildSearchEngine } from '@coveo/headless';
import { useMemo } from 'react';
import type { CoveoConfig } from './config';
import { toEngineConfiguration } from './search/engine';
import { POKEMON_RESULT_FIELDS, PokemonResult } from './search/PokemonResult';

export function App({ config }: { config: CoveoConfig }) {
  const engine = useMemo(
    () => buildSearchEngine({ configuration: toEngineConfiguration(config) }),
    [config],
  );

  return (
    <>
      <h1>Pokémon Search</h1>
      <AtomicSearchInterface engine={engine} fieldsToInclude={POKEMON_RESULT_FIELDS}>
        <AtomicSearchLayout>
          <AtomicLayoutSection section="search">
            <AtomicSearchBox />
          </AtomicLayoutSection>
          <AtomicLayoutSection section="facets">
            <AtomicFacetManager>
              <AtomicFacet
                field="pokemon_type"
                label="Type"
                sortCriteria="alphanumeric"
                numberOfValues={18}
              />
              <AtomicFacet
                field="pokemon_generation"
                label="Generation"
                sortCriteria="alphanumericNatural"
                numberOfValues={10}
              />
            </AtomicFacetManager>
          </AtomicLayoutSection>
          <AtomicLayoutSection section="main">
            <AtomicLayoutSection section="status">
              <AtomicQuerySummary />
            </AtomicLayoutSection>
            <AtomicLayoutSection section="results">
              <AtomicResultList
                display="grid"
                imageSize="large"
                template={() => <PokemonResult />}
              />
              <AtomicNoResults />
              <AtomicQueryError />
            </AtomicLayoutSection>
          </AtomicLayoutSection>
        </AtomicSearchLayout>
      </AtomicSearchInterface>
    </>
  );
}
