const NARROW_RESULT_COLUMNS = 4;
const WIDE_RESULT_COLUMNS = 6;

function greatestCommonDivisor(first: number, second: number): number {
  return second ? greatestCommonDivisor(second, first % second) : first;
}

// Page sizes are multiples of this, so every row is full at both column counts.
const FULL_ROW_UNIT =
  (NARROW_RESULT_COLUMNS * WIDE_RESULT_COLUMNS) / greatestCommonDivisor(NARROW_RESULT_COLUMNS, WIDE_RESULT_COLUMNS);
const MEDIUM_PAGE_MULTIPLE = 2;
const LARGE_PAGE_MULTIPLE = 4;
const LARGEST_PAGE_MULTIPLE = 8;

export const RESULT_COLUMNS = { narrow: NARROW_RESULT_COLUMNS, wide: WIDE_RESULT_COLUMNS };

export const DEFAULT_PAGE_SIZE = FULL_ROW_UNIT;

export const PAGE_SIZES = [
  DEFAULT_PAGE_SIZE,
  FULL_ROW_UNIT * MEDIUM_PAGE_MULTIPLE,
  FULL_ROW_UNIT * LARGE_PAGE_MULTIPLE,
  FULL_ROW_UNIT * LARGEST_PAGE_MULTIPLE,
];

// A ceiling well above any facet's values, so that new values are never hidden.
export const FACET_VALUE_LIMIT = 100;

export const SEARCH_HUB = 'pokebowl-search';

export const POKEMON_FIELDS = {
  name: 'pokemon_name',
  image: 'pokemon_image',
  number: 'pokemon_number',
  type: 'pokemon_type',
  generation: 'pokemon_generation',
} as const;

// Query ranking modifier for names that start with a one-word search. Chosen by npm run eval:prefix-benchmark.
export const NAME_PREFIX_BOOST = 300;

export const POKEDEX_NUMBER_WIDTH = 4;
export const UNKNOWN_POKEDEX_NUMBER = '???';

// Atomic expects sort expressions without "@" before the field, and Headless adds it to the request.
export const RELEVANCY_SORT = 'relevancy';
export const POKEDEX_SORT = `${POKEMON_FIELDS.number} ascending`;
const NAME_SORT = `${POKEMON_FIELDS.name} ascending`;

export const SORT_OPTIONS = [
  { label: 'Best match', expression: RELEVANCY_SORT },
  { label: 'Pokédex number', expression: POKEDEX_SORT },
  { label: 'Name A to Z', expression: NAME_SORT },
];

export const POKEBALL_IMAGE = '/pokeball.svg';

// The detail page is a query parameter, so a static host needs no rewrite rules.
export const POKEMON_DETAIL_PARAM = 'pokemon';

export const POKEMON_DETAIL_ONLY_FIELDS = {
  species: 'pokemon_species',
  height: 'pokemon_height',
  weight: 'pokemon_weight',
  abilities: 'pokemon_abilities',
  total: 'pokemon_total',
} as const;

export const POKEMON_STATS = [
  { field: 'pokemon_hp', label: 'HP' },
  { field: 'pokemon_attack', label: 'Attack' },
  { field: 'pokemon_defense', label: 'Defense' },
  { field: 'pokemon_sp_atk', label: 'Sp. Atk' },
  { field: 'pokemon_sp_def', label: 'Sp. Def' },
  { field: 'pokemon_speed', label: 'Speed' },
];

// The highest value a single base stat can have in the games.
export const STAT_BAR_MAXIMUM = 255;

// How long the detail page waits for the stored page before hiding the Pokédex entries.
export const POKEDEX_ENTRIES_TIMEOUT_MS = 8000;

// {name} is replaced with the Pokémon's name. Short descriptive questions gave the best answers in testing.
export const ASK_POKEMON_QUESTIONS = [
  'Describe the appearance and behavior of {name}',
  'Describe the strengths of {name} in battle',
  'Describe how {name} evolves',
];
