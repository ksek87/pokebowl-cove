// Generates the Query Suggestions default queries file from the Coveo index.
// Run: node --env-file=.env scripts/generate-default-queries.ts
import { writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { readCoveoConfig } from '../src/config.ts';
import { buildCandidates, type Candidate, FIELDS, isSensibleResult, toCsv } from '../src/tooling/defaultQueries.ts';

const OUTPUT = 'configs/coveo/query-suggestions-default-queries.csv';
const SEARCH_HUB = 'pokebowl-search';
const READ_PAGE_SIZE = 1000;
const VALIDATION_RESULTS = 12;
const PAUSE_MS = 100;
const NO_PAUSE_MS = 0;
const FIRST_RESULT = 0;

interface SearchResponse {
  totalCount: number;
  results: { raw: Record<string, unknown> }[];
}

const { organizationId, searchApiKey } = readCoveoConfig(process.env);

async function search(body: object): Promise<SearchResponse> {
  const response = await fetch(`https://${organizationId}.org.coveo.com/rest/search/v2?organizationId=${organizationId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${searchApiKey}` },
    body: JSON.stringify({
      searchHub: SEARCH_HUB,
      analytics: { capture: false },
      fieldsToInclude: Object.values(FIELDS),
      ...body,
    }),
  });
  if (!response.ok) {
    throw new Error(`Search failed with status ${response.status}`);
  }
  return (await response.json()) as SearchResponse;
}

async function readAllItems(): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let totalCount = Number.POSITIVE_INFINITY;
  while (items.length < totalCount) {
    const page = await search({
      q: '',
      firstResult: items.length,
      numberOfResults: READ_PAGE_SIZE,
      sortCriteria: `@${FIELDS.name} ascending`,
    });
    if (!page.results.length) {
      break;
    }
    totalCount = page.totalCount;
    items.push(...page.results.map((result): Record<string, unknown> => result.raw));
  }
  return items;
}

/** Returns why a query should be dropped, or null when it is good. */
async function problemWith(candidate: Candidate): Promise<string | null> {
  const { results } = await search({ q: candidate.query, firstResult: FIRST_RESULT, numberOfResults: VALIDATION_RESULTS });
  if (!results.length) {
    return 'no results';
  }
  return results.some((result): boolean => isSensibleResult(candidate, result.raw)) ? null : 'no matching result in the top results';
}

interface Validated {
  kept: Candidate[];
  dropped: { candidate: Candidate; reason: string }[];
}

async function validate(candidates: Candidate[]): Promise<Validated> {
  const validated: Validated = { kept: [], dropped: [] };
  for (const candidate of candidates) {
    // Names come directly from the items they retrieve, so they need no check.
    const reason = candidate.category === 'name' ? null : await problemWith(candidate);
    if (reason) {
      validated.dropped.push({ candidate, reason });
    } else {
      validated.kept.push(candidate);
    }
    await sleep(candidate.category === 'name' ? NO_PAUSE_MS : PAUSE_MS);
  }
  return validated;
}

function report(itemCount: number, { kept, dropped }: Validated): void {
  console.log(`Items read: ${itemCount}`);
  console.log(`Queries written: ${kept.length}`);
  for (const [category, entries] of Object.entries(Object.groupBy(kept, (candidate): string => candidate.category))) {
    console.log(`  ${category}: ${String(entries?.length)}`);
  }
  console.log(`Dropped: ${dropped.length}`);
  for (const { candidate, reason } of dropped) {
    console.log(`  [${candidate.category}] ${candidate.query}: ${reason}`);
  }
}

async function main(): Promise<void> {
  const items = await readAllItems();
  const validated = await validate(buildCandidates(items));
  await writeFile(OUTPUT, toCsv(validated.kept), 'utf8');
  report(items.length, validated);
}

void main();
