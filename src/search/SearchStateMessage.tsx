import type { SearchEngine } from '@coveo/headless';
import { type JSX, type ReactNode, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CONTROL_BUTTON_CLASS } from './controlStyles.ts';
import { parsePokedexNumber } from './queryRewrite.ts';
import { POKEBALL_IMAGE } from './settings.ts';
import { retrySearch, showAll } from './showAllWhenCleared.ts';
import { useSearchStatus } from './useSearchStatus.ts';

function useQuery(engine: SearchEngine): string {
  const [query, setQuery] = useState(engine.state.query?.q ?? '');

  useEffect(() => engine.subscribe((): void => setQuery(engine.state.query?.q ?? '')), [engine]);

  return query;
}

function noResultsText(query: string): string {
  const pokedexNumber = parsePokedexNumber(query);
  if (pokedexNumber) {
    return `There is no Pokémon with Pokédex number #${pokedexNumber}.`;
  }
  return query.trim() ? `Nothing matched “${query}”. Try a different name, Type or ability.` : 'Nothing matched these filters.';
}

function Content({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action: ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <img className="size-(--size-state-image) opacity-60" src={POKEBALL_IMAGE} alt="" />
      <p className="text-2xl font-black text-foreground">{title}</p>
      <p className="text-muted-foreground">{text}</p>
      {action}
    </div>
  );
}

function renderState(engine: SearchEngine, query: string, hasError: boolean): JSX.Element {
  if (hasError) {
    return (
      <Content
        title="Search is not available right now"
        text="The Pokémon could not be loaded. Check your connection and try again."
        action={
          <Button variant="outline" className={CONTROL_BUTTON_CLASS} onClick={(): void => retrySearch(engine)}>
            Try again
          </Button>
        }
      />
    );
  }
  return (
    <Content
      title="No Pokémon found"
      text={noResultsText(query)}
      action={
        <Button
          variant="outline"
          className={CONTROL_BUTTON_CLASS}
          onClick={(): void => showAll(engine, { clearFilters: true })}
        >
          Show all Pokémon
        </Button>
      }
    />
  );
}

/**
 * Atomic's error view cannot hide the service URL or offer a retry, and its
 * no-results text cannot vary by query, so both states are rendered from search status.
 */
export function SearchStateMessage({ engine }: { engine: SearchEngine }): JSX.Element {
  const { firstSearchExecuted, isLoading, hasResults, hasError } = useSearchStatus(engine);
  const query = useQuery(engine);
  const isEmpty = firstSearchExecuted && !isLoading && !hasResults;

  return (
    <div data-slot="search-state" role="status" className="w-full">
      {hasError || isEmpty ? renderState(engine, query, hasError) : null}
    </div>
  );
}
