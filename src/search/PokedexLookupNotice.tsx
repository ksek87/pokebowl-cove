import type { SearchEngine } from '@coveo/headless';
import { type JSX, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { parsePokedexNumber } from './queryRewrite.ts';

export function PokedexLookupNotice({ engine }: { engine: SearchEngine }): JSX.Element | null {
  const [query, setQuery] = useState(engine.state.query?.q ?? '');

  useEffect(
    () => engine.subscribe((): void => setQuery(engine.state.query?.q ?? '')),
    [engine],
  );

  const pokedexNumber = parsePokedexNumber(query);
  if (!pokedexNumber) {
    return null;
  }

  return (
    <p
      role="status"
      className="flex basis-full flex-wrap items-center gap-2 rounded-xl border-2 border-border bg-card px-4 py-2.5 text-[15px] font-semibold text-foreground"
    >
      <Badge className="font-extrabold">Pokédex lookup</Badge>
      Showing Pokédex number #{pokedexNumber}. Numbers search by Pokédex number only, so try a word
      to search descriptions.
    </p>
  );
}
