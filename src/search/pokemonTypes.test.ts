import { describe, expect, it } from 'vitest';
import {
  POKEMON_TYPES,
  TINT_STRENGTH,
  cardTint,
  contrastRatio,
  readTypes,
  typeBadge,
} from './pokemonTypes.ts';

const WCAG_AA_TEXT_CONTRAST = 4.5;
const WHITE = '#ffffff';
const BLACK = '#000000';
const MAXIMUM_CONTRAST = 21;

describe('contrastRatio', (): void => {
  it('gives the known maximum for black on white', (): void => {
    expect(contrastRatio(BLACK, WHITE)).toBe(MAXIMUM_CONTRAST);
  });
});

describe('typeBadge', (): void => {
  it.each(POKEMON_TYPES)('keeps %s badge text readable', (type): void => {
    const { background, color } = typeBadge(type);

    expect(contrastRatio(background, color)).toBeGreaterThanOrEqual(WCAG_AA_TEXT_CONTRAST);
  });

  it('falls back to a neutral badge for an unknown Type', (): void => {
    expect(typeBadge('Stellar').background).toBe(typeBadge('Normal').background);
  });
});

describe('cardTint', (): void => {
  it('blends both colors for a dual-Type Pokémon', (): void => {
    const tint = cardTint(['Fire', 'Flying']);

    expect(tint).toContain(typeBadge('Fire').background);
    expect(tint).toContain(typeBadge('Flying').background);
  });

  it('uses one color for a single-Type Pokémon', (): void => {
    const tint = cardTint(['Water']);

    expect(tint).toContain(typeBadge('Water').background);
    expect(tint).not.toContain(typeBadge('Fire').background);
  });

  it.each([[['Fire']], [['Fire', 'Flying']]])('keeps the tint subtle for %j', (types): void => {
    const strengths = [...cardTint(types).matchAll(/(?<strength>\d+)%/g)].map(
      (match): number => Number(match.groups?.strength),
    );

    expect(Math.max(...strengths)).toBeLessThanOrEqual(TINT_STRENGTH);
  });

  it('still returns a tint when Types are missing', (): void => {
    expect(cardTint([])).toContain(typeBadge('Normal').background);
  });
});

describe('readTypes', (): void => {
  it('accepts the list Coveo returns for a multi-value field', (): void => {
    expect(readTypes(['Fire', 'Flying'])).toEqual(['Fire', 'Flying']);
  });

  it('accepts a single string', (): void => {
    expect(readTypes('Water')).toEqual(['Water']);
  });

  it('returns an empty list for a missing value', (): void => {
    expect(readTypes(undefined)).toEqual([]);
  });
});
