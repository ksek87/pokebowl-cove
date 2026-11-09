import { buildQuickview, type Result, type SearchEngine } from '@coveo/headless';
import { type JSX, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FOCUS_LINK_CLASS, PANEL_CARD_CLASS } from './controlStyles.ts';
import { type PokedexEntry, parsePokedexEntries } from './pokedexEntries.ts';
import { POKEDEX_ENTRIES_TIMEOUT_MS } from './settings.ts';

const SECTION_TITLE = 'Pokédex entries';
const ENTRY_LIST_CLASS = 'grid gap-3';
const PLACEHOLDER_BLOCK = 'rounded bg-muted text-transparent';

interface StoredPage {
  content: string;
  isLoading: boolean;
}

/**
 * Fetches the stored page through Quickview. Headless has no failed state for this
 * request, so a timeout ends the wait and the section hides itself.
 */
function useStoredPage(engine: SearchEngine, result: Result): StoredPage {
  const quickview = useMemo(() => buildQuickview(engine, { options: { result } }), [engine, result]);
  const [page, setPage] = useState<StoredPage>({ content: '', isLoading: result.hasHtmlVersion });

  useEffect(() => {
    if (!result.hasHtmlVersion) {
      return undefined;
    }
    quickview.fetchResultContent();
    const stop = quickview.subscribe((): void => {
      setPage({ content: quickview.state.content, isLoading: quickview.state.isLoading });
    });
    const timeout = setTimeout((): void => {
      setPage((current) => ({ ...current, isLoading: false }));
    }, POKEDEX_ENTRIES_TIMEOUT_MS);
    return (): void => {
      stop();
      clearTimeout(timeout);
    };
  }, [quickview, result.hasHtmlVersion]);

  return page;
}

function Games({ games }: { games: string[] }): JSX.Element {
  return <p className="text-(length:--text-small) font-bold text-muted-foreground">{games.join(', ')}</p>;
}

function EntryList({ entries }: { entries: PokedexEntry[] }): JSX.Element {
  return (
    <ul className={ENTRY_LIST_CLASS}>
      {entries.map(({ text, games }) => (
        <li key={text}>
          <p>{text}</p>
          <Games games={games} />
        </li>
      ))}
    </ul>
  );
}

function SectionCard({ children }: { children: JSX.Element | JSX.Element[] }): JSX.Element {
  return (
    <Card className={`mt-4 ${PANEL_CARD_CLASS}`}>
      <CardContent className="grid gap-4 p-8">{children}</CardContent>
    </Card>
  );
}

function Placeholder(): JSX.Element {
  return (
    <div aria-hidden="true" data-slot="pokedex-placeholder">
      <SectionCard>
        <p className="animate-pulse text-lg font-extrabold motion-reduce:animate-none">
          <span className={PLACEHOLDER_BLOCK}>{SECTION_TITLE}</span>
        </p>
        <p className="animate-pulse text-lg font-semibold motion-reduce:animate-none">
          <span className={PLACEHOLDER_BLOCK}>Pokédex text is loading from the stored page</span>
        </p>
      </SectionCard>
    </div>
  );
}

export function PokedexEntries({
  engine,
  result,
  sourceUrl,
}: {
  engine: SearchEngine;
  result: Result;
  sourceUrl: string;
}): JSX.Element | null {
  const { content, isLoading } = useStoredPage(engine, result);
  const entries = useMemo(() => (content ? parsePokedexEntries(content) : null), [content]);

  if (isLoading) {
    return <Placeholder />;
  }
  if (!entries) {
    return null;
  }

  const { lead, more, forms } = entries;
  const hiddenCount = more.length + forms.reduce((count, form) => count + form.entries.length, 0);

  return (
    <section aria-label={SECTION_TITLE}>
      <SectionCard>
        <h2 className="text-lg font-extrabold">{SECTION_TITLE}</h2>
        <blockquote>
          <p className="text-lg font-semibold">{lead.text}</p>
          <Games games={lead.games} />
        </blockquote>
        {hiddenCount > 0 ? (
          <details>
            <summary className={`w-fit cursor-pointer rounded font-bold text-primary ${FOCUS_LINK_CLASS}`}>
              More entries ({hiddenCount})
            </summary>
            <div className="mt-3 grid gap-5">
              {more.length > 0 ? <EntryList entries={more} /> : <></>}
              {forms.map(({ form, entries: formEntries }) => (
                <div key={form}>
                  <h3 className="mb-2 font-extrabold">{form}</h3>
                  <EntryList entries={formEntries} />
                </div>
              ))}
            </div>
          </details>
        ) : (
          <></>
        )}
        <p className="text-(length:--text-small) text-muted-foreground">
          Pokédex text from the Pokémon games, via{' '}
          <a className="font-bold underline" href={sourceUrl}>
            Pokémon Database
          </a>
        </p>
      </SectionCard>
    </section>
  );
}
