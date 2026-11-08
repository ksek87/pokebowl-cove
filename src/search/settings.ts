const NARROW_RESULT_COLUMNS = 3;
const WIDE_RESULT_COLUMNS = 4;

// Page sizes are multiples of this, so every row is full at both column counts.
const FULL_ROW_UNIT = NARROW_RESULT_COLUMNS * WIDE_RESULT_COLUMNS;
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

export const POKEDEX_NUMBER_FIELD = 'pokemon_number';
export const POKEDEX_NUMBER_WIDTH = 4;
export const POKEDEX_SORT = `@${POKEDEX_NUMBER_FIELD} ascending`;
export const NAME_SORT = '@pokemon_name ascending';

export const POKEBALL_IMAGE = '/pokeball.svg';
