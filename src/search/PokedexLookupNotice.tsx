import type { SearchEngine } from '@coveo/headless';
import { type JSX, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { parsePokedexNumber } from './queryRewrite.ts';
import { useSearchStatus } from './useSearchStatus.ts';

export function PokedexLookupNotice({ engine }: { engine: SearchEngine }): JSX.Element | null {
  const { hasResults, hasError } = useSearchStatus(engine);
  const [query, setQuery] = useState(engine.state.query?.q ?? '');

  useEffect(
    () => engine.subscribe((): void => setQuery(engine.state.query?.q ?? '')),
    [engine],
  );

  const pokedexNumber = parsePokedexNumber(query);
  if (!pokedexNumber || !hasResults || hasError) {
    return null;
  }

  return (
    <p
      role="status"
      className="flex basis-full flex-wrap items-center gap-2 rounded-xl border-2 border-border bg-card px-4 py-2.5 text-(length:--text-label) font-semibold text-foreground"
    >
      <Badge className="font-extrabold">Pokédex lookup</Badge>
      Showing #{pokedexNumber}. Use words to search descriptions.
    </p>
  );
}
