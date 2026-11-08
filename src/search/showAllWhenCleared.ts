import {
  loadQueryActions,
  loadSearchActions,
  loadSearchAnalyticsActions,
  type SearchEngine,
} from '@coveo/headless';

function isSearchBoxCleared(engine: SearchEngine): boolean {
  const { query, querySet } = engine.state;
  const boxTexts = Object.values(querySet ?? {});
  return Boolean(query?.q) && Boolean(boxTexts.length) && boxTexts.every((text): boolean => !text);
}

/**
 * Atomic's search box only empties its text when cleared, and the previous
 * results stay on screen until the next submit. This runs that search.
 */
export function showAllWhenCleared(engine: SearchEngine): () => void {
  return engine.subscribe((): void => {
    if (!isSearchBoxCleared(engine)) {
      return;
    }
    const { updateQuery } = loadQueryActions(engine);
    const { executeSearch } = loadSearchActions(engine);
    const { logSearchboxSubmit } = loadSearchAnalyticsActions(engine);
    engine.dispatch(updateQuery({ q: '' }));
    engine.dispatch(executeSearch(logSearchboxSubmit()));
  });
}
