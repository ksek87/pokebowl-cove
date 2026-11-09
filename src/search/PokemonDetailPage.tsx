import {
  buildResultList,
  buildSearchEngine,
  buildSearchStatus,
  loadAdvancedSearchQueryActions,
  loadSearchActions,
  loadSearchAnalyticsActions,
  type ResultListState,
  type SearchEngine,
  type SearchStatusState,
} from '@coveo/headless';
import { type JSX, type MouseEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { CoveoConfig } from '../config.ts';
import { CONTROL_BUTTON_CLASS } from './controlStyles.ts';
import { toEngineConfiguration } from './engine.ts';
import { DetailPlaceholder } from './LoadingPlaceholders.tsx';
import {
  exactNameExpression,
  findRequestedPokemon,
  POKEMON_DETAIL_FIELDS,
  type PokemonDetail,
  toPokemonDetail,
} from './pokemonDetail.ts';
import { PokemonImage } from './PokemonResult.tsx';
import { cardTint, typeBadge } from './pokemonTypes.ts';
import { SiteHeader } from './SiteHeader.tsx';
import { STAT_BAR_MAXIMUM } from './settings.ts';

const PERCENT = 100;
const SITE_TITLE = 'Pokémon Search';
const STAT_ROW_LAYOUT = 'grid grid-cols-[5rem_3rem_1fr] items-center gap-2';

/** Runs the exact-name lookup. Analytics stay off, because a page load is not a search someone made. */
function usePokemonLookup(
  config: CoveoConfig,
  name: string,
): { results: ResultListState['results']; status: SearchStatusState; runLookup: () => void } {
  const { engine, resultList, searchStatus } = useMemo(() => {
    const lookupEngine: SearchEngine = buildSearchEngine({
      configuration: { ...toEngineConfiguration(config), analytics: { enabled: false } },
    });
    return {
      engine: lookupEngine,
      resultList: buildResultList(lookupEngine, { options: { fieldsToInclude: POKEMON_DETAIL_FIELDS } }),
      searchStatus: buildSearchStatus(lookupEngine),
    };
  }, [config]);
  const [results, setResults] = useState(resultList.state.results);
  const [status, setStatus] = useState(searchStatus.state);

  useEffect(() => resultList.subscribe((): void => setResults(resultList.state.results)), [resultList]);
  useEffect(() => searchStatus.subscribe((): void => setStatus(searchStatus.state)), [searchStatus]);

  const runLookup = useCallback((): void => {
    const { updateAdvancedSearchQueries } = loadAdvancedSearchQueryActions(engine);
    const { executeSearch } = loadSearchActions(engine);
    const { logInterfaceLoad } = loadSearchAnalyticsActions(engine);
    engine.dispatch(updateAdvancedSearchQueries({ aq: exactNameExpression(name) }));
    engine.dispatch(executeSearch(logInterfaceLoad()));
  }, [engine, name]);

  useEffect(runLookup, [runLookup]);

  return { results, status, runLookup };
}

function goBackToSearch(event: MouseEvent<HTMLAnchorElement>): void {
  if (document.referrer.startsWith(window.location.origin)) {
    event.preventDefault();
    window.history.back();
  }
}

function Fact({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div>
      <dt className="text-(length:--text-small) font-bold text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}

function Stats({ detail }: { detail: PokemonDetail }): JSX.Element {
  if (!detail.stats.length) {
    return <p className="text-muted-foreground">Base stats are not available yet.</p>;
  }

  return (
    <dl className="grid gap-2">
      {detail.stats.map(({ label, value }) => (
        <div key={label} data-slot="pokemon-stat" className={STAT_ROW_LAYOUT}>
          <dt className="font-bold text-muted-foreground">{label}</dt>
          <dd className="contents">
            <span className="text-right font-extrabold">{value}</span>
            <Progress aria-hidden="true" value={Math.min(PERCENT, (value / STAT_BAR_MAXIMUM) * PERCENT)} />
          </dd>
        </div>
      ))}
      {Boolean(detail.total) && (
        <div className={STAT_ROW_LAYOUT}>
          <dt className="font-bold text-muted-foreground">Total</dt>
          <dd className="text-right font-extrabold">{detail.total}</dd>
        </div>
      )}
    </dl>
  );
}

function PokemonDetails({ detail }: { detail: PokemonDetail }): JSX.Element {
  return (
    <Card className="overflow-hidden border-border rounded-(--radius-panel) border-(length:--size-panel-border) border-b-(length:--size-card-edge) py-0 shadow-none">
      <CardContent className="grid p-0 lg:grid-cols-2">
        <div
          className="flex aspect-square items-center lg:aspect-auto justify-center p-10"
          style={{ background: cardTint(detail.types) }}
        >
          <PokemonImage image={detail.image} name={detail.name} className="size-auto max-h-full max-w-full" />
        </div>
        <div className="grid content-start gap-5 p-8">
          <div>
            {Boolean(detail.number) && (
              <p className="text-(length:--text-label) font-bold text-muted-foreground">#{detail.number}</p>
            )}
            <h1 className="text-4xl font-black tracking-tight">{detail.name}</h1>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {detail.types.map((type) => (
                <li key={type}>
                  <Badge className="px-3 text-(length:--text-small) font-extrabold" style={typeBadge(type)}>
                    {type}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
          <dl className="grid grid-cols-2 gap-4">
            <Fact label="Species">{detail.species}</Fact>
            <Fact label="Generation">{detail.generation}</Fact>
            <Fact label="Height">{detail.height}</Fact>
            <Fact label="Weight">{detail.weight}</Fact>
            <Fact label="Abilities">{detail.abilities.join(', ')}</Fact>
          </dl>
          <section aria-label="Base stats">
            <h2 className="mb-2 text-lg font-extrabold">Base stats</h2>
            <Stats detail={detail} />
          </section>
          <a className="font-bold text-primary underline" href={detail.sourceUrl}>
            View on pokemondb.net
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

function Message({ title, children }: { title: string; children?: ReactNode }): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <h1 className="text-2xl font-black">{title}</h1>
      {children}
    </div>
  );
}

function renderContent(
  name: string,
  results: ResultListState['results'],
  { firstSearchExecuted, isLoading, hasError }: SearchStatusState,
  retry: () => void,
): JSX.Element {
  if (hasError) {
    return (
      <Message title="Something went wrong">
        <p className="text-muted-foreground">The Pokémon could not be loaded.</p>
        <Button variant="outline" className={CONTROL_BUTTON_CLASS} onClick={retry}>
          Try again
        </Button>
      </Message>
    );
  }
  if (!firstSearchExecuted || isLoading) {
    return (
      <>
        <span className="sr-only">Loading {name}</span>
        <DetailPlaceholder />
      </>
    );
  }
  const result = findRequestedPokemon(results, name);
  return result ? (
    <PokemonDetails detail={toPokemonDetail(result)} />
  ) : (
    <Message title="Pokémon not found">
      <p className="text-muted-foreground">No Pokémon is named “{name}”.</p>
    </Message>
  );
}

export function PokemonDetailPage({ config, name }: { config: CoveoConfig; name: string }): JSX.Element {
  const { results, status, runLookup } = usePokemonLookup(config, name);

  useEffect((): void => {
    document.title = `${name} | ${SITE_TITLE}`;
  }, [name]);

  return (
    <>
      <SiteHeader isPageHeading={false} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-(--size-gutter) pb-16">
        <div className="mb-4">
          <Button asChild variant="outline" className={CONTROL_BUTTON_CLASS}>
            <a href="/" onClick={goBackToSearch}>
              Back to search
            </a>
          </Button>
        </div>
        <div role="status">{renderContent(name, results, status, runLookup)}</div>
      </main>
    </>
  );
}
