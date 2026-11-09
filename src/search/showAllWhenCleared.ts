import {
  loadBreadcrumbActions,
  loadPaginationActions,
  loadQueryActions,
  loadSearchActions,
  loadSearchAnalyticsActions,
  type SearchEngine,
} from '@coveo/headless';

const FIRST_PAGE = 1;
const SEARCH_BOX_TAG = 'ATOMIC-SEARCH-BOX';
const CLEAR_BUTTON_PART = 'clear-button';

function isSearchBoxClearClick(event: Event): boolean {
  const elements = event.composedPath().filter((target): target is Element => target instanceof Element);
  return (
    elements.some((element): boolean => element.getAttribute('part') === CLEAR_BUTTON_PART) &&
    elements.some((element): boolean => element.tagName === SEARCH_BOX_TAG)
  );
}

/** Runs the search for everything, from the first page. */
export function showAll(engine: SearchEngine, { clearFilters = false } = {}): void {
  if (clearFilters) {
    engine.dispatch(loadBreadcrumbActions(engine).deselectAllBreadcrumbs());
  }
  const { updatePage } = loadPaginationActions(engine);
  const { updateQuery } = loadQueryActions(engine);
  const { executeSearch } = loadSearchActions(engine);
  const { logSearchboxSubmit } = loadSearchAnalyticsActions(engine);
  engine.dispatch(updateQuery({ q: '' }));
  engine.dispatch(updatePage(FIRST_PAGE));
  engine.dispatch(executeSearch(logSearchboxSubmit()));
}

/** Runs the current search again after a failure. */
export function retrySearch(engine: SearchEngine): void {
  const { executeSearch } = loadSearchActions(engine);
  const { logInterfaceLoad } = loadSearchAnalyticsActions(engine);
  engine.dispatch(executeSearch(logInterfaceLoad()));
}

/**
 * Atomic's clear button only empties the text, and the previous results stay
 * on screen. This runs the search for everything when that button is used.
 * Emptying the box by keyboard follows Atomic's behavior and waits for Enter.
 */
export function showAllWhenCleared(engine: SearchEngine): () => void {
  function onClick(event: Event): void {
    if (!isSearchBoxClearClick(event) || !engine.state.query?.q) {
      return;
    }
    showAll(engine);
  }

  document.addEventListener('click', onClick);
  return (): void => document.removeEventListener('click', onClick);
}
