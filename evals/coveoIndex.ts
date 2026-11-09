import type { CoveoConfig } from '../src/config.ts';

export interface IndexedItem {
  clickUri: string;
  raw: Record<string, unknown>;
}

const LARGEST_PAGE = 1000;
const FIELDS = ['pokemon_name', 'pokemon_number', 'pokemon_type', 'pokemon_generation', 'pokemon_image'];

/** Reads every item the search key can see, without recording analytics. */
export async function fetchIndexedItems(
  config: CoveoConfig,
  api: typeof fetch = fetch,
  pageSize: number = LARGEST_PAGE,
): Promise<IndexedItem[]> {
  const items: IndexedItem[] = [];
  let total = Infinity;
  while (items.length < total) {
    const response = await api(`https://${config.organizationId}.org.coveo.com/rest/search/v2`, {
      method: 'POST',
      headers: { authorization: `Bearer ${config.searchApiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        q: '',
        firstResult: items.length,
        numberOfResults: pageSize,
        sortCriteria: '@pokemon_number ascending',
        fieldsToInclude: FIELDS,
        analytics: { capture: false },
        maximumAge: 0,
      }),
    });
    if (!response.ok) {
      throw new Error(`The Search API returned ${response.status}.`);
    }
    const page = (await response.json()) as { totalCount: number; results: IndexedItem[] };
    if (!page.results.length) {
      break;
    }
    items.push(...page.results);
    total = page.totalCount;
  }
  return items;
}
