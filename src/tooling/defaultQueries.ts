export const FIELDS = {
  name: 'pokemon_name',
  type: 'pokemon_type',
  generation: 'pokemon_generation',
  abilities: 'pokemon_abilities',
  species: 'pokemon_species',
} as const;

// Coveo considers at most this many default queries per language.
export const MAX_DEFAULT_QUERIES = 5000;

const UNKNOWN_VALUE = '???';
const TYPE_PAIR_LENGTH = 2;

type Category = 'name' | 'type' | 'generation' | 'typePair' | 'ability' | 'species';

const NAME_WEIGHT = 1000;
const TYPE_AND_GENERATION_WEIGHT = 500;
const TYPE_PAIR_WEIGHT = 200;
const ABILITY_AND_SPECIES_WEIGHT = 100;

// The relative importance Coveo reads from the second column of the default queries file.
export const CATEGORY_WEIGHTS: Record<Category, number> = {
  name: NAME_WEIGHT,
  type: TYPE_AND_GENERATION_WEIGHT,
  generation: TYPE_AND_GENERATION_WEIGHT,
  typePair: TYPE_PAIR_WEIGHT,
  ability: ABILITY_AND_SPECIES_WEIGHT,
  species: ABILITY_AND_SPECIES_WEIGHT,
};

export interface Candidate {
  category: Category;
  query: string;
  field: string;
  values: string[];
}

export type CsvRow = Pick<Candidate, 'query' | 'category'>;

type Item = Record<string, unknown>;

const byNaturalOrder = (first: string, second: string): number =>
  first.localeCompare(second, 'en', { numeric: true });

export function toValues(value: unknown): string[] {
  const list: unknown[] = Array.isArray(value) ? value : [value];
  return list
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry): string => entry.trim().replace(/\s+/g, ' '))
    .filter((entry): boolean => entry !== '' && entry !== UNKNOWN_VALUE);
}

function distinctValues(items: Item[], field: string): string[] {
  return [...new Set(items.flatMap((item): string[] => toValues(item[field])))].sort(byNaturalOrder);
}

function singleValueCandidates(
  items: Item[],
  { category, field, word }: { category: Category; field: string; word: (value: string) => string },
): Candidate[] {
  return distinctValues(items, field).map(
    (value): Candidate => ({ category, query: word(value), field, values: [value] }),
  );
}

function typePairs(items: Item[]): Candidate[] {
  const pairs = new Map<string, string[]>();
  for (const item of items) {
    const types = toValues(item[FIELDS.type]);
    if (types.length === TYPE_PAIR_LENGTH) {
      pairs.set(types.join(' ').toLowerCase(), types);
    }
  }
  return [...pairs.entries()]
    .sort(([first], [second]): number => byNaturalOrder(first, second))
    .map(([query, values]): Candidate => ({ category: 'typePair', query, field: FIELDS.type, values }));
}

/** Lists every suggestion candidate. Coveo lowercases suggestions, so duplicates ignore case. */
export function buildCandidates(items: Item[]): Candidate[] {
  const asIndexed = (value: string): string => value;
  const all = [
    ...singleValueCandidates(items, { category: 'name', field: FIELDS.name, word: asIndexed }),
    ...singleValueCandidates(items, {
      category: 'type',
      field: FIELDS.type,
      word: (value): string => `${value.toLowerCase()} type`,
    }),
    ...singleValueCandidates(items, {
      category: 'generation',
      field: FIELDS.generation,
      word: (value): string => value.toLowerCase(),
    }),
    ...typePairs(items),
    ...singleValueCandidates(items, { category: 'ability', field: FIELDS.abilities, word: asIndexed }),
    ...singleValueCandidates(items, { category: 'species', field: FIELDS.species, word: asIndexed }),
  ];
  const seen = new Set<string>();
  return all.filter((candidate): boolean => {
    const key = candidate.query.toLowerCase();
    return !seen.has(key) && Boolean(seen.add(key));
  });
}

export function isSensibleResult(candidate: Candidate, raw: Item): boolean {
  const found = toValues(raw[candidate.field]).map((value): string => value.toLowerCase());
  return candidate.values.every((value): boolean => found.includes(value.toLowerCase()));
}

function csvRow({ query, category }: CsvRow): string {
  const text = /[",\r\n]/.test(query) ? `"${query.replaceAll('"', '""')}"` : query;
  return `${text},${CATEGORY_WEIGHTS[category]}\n`;
}

export function toCsv(rows: CsvRow[]): string {
  if (rows.length > MAX_DEFAULT_QUERIES) {
    throw new Error(`${rows.length} queries exceed the limit of ${MAX_DEFAULT_QUERIES}`);
  }
  return rows.map(csvRow).join('');
}
