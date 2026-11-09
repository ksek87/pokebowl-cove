import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import { POKEMON_TYPES, TINT_STRENGTH, cardTint, readTypes, typeBadge } from './pokemonTypes.ts';

const WCAG_AA_TEXT_CONTRAST = 4.5;
const WHITE = '#ffffff';
const BLACK = '#000000';
const MAXIMUM_CONTRAST = 21;

// Constants from the WCAG 2 definition of relative luminance and contrast.
const HEX_RADIX = 16;
const CHANNEL_MAX = 255;
const LINEAR_THRESHOLD = 0.03928;
const LINEAR_DIVISOR = 12.92;
const GAMMA_OFFSET = 0.055;
const GAMMA_DIVISOR = 1.055;
const GAMMA_EXPONENT = 2.4;
const RED_WEIGHT = 0.2126;
const GREEN_WEIGHT = 0.7152;
const BLUE_WEIGHT = 0.0722;
const CONTRAST_FLARE = 0.05;

let theme = '';

beforeAll(async (): Promise<void> => {
  theme = await readFile('src/theme.css', 'utf8');
});

function linearChannel(hexPair: string): number {
  const channel = parseInt(hexPair, HEX_RADIX) / CHANNEL_MAX;
  return channel <= LINEAR_THRESHOLD
    ? channel / LINEAR_DIVISOR
    : ((channel + GAMMA_OFFSET) / GAMMA_DIVISOR) ** GAMMA_EXPONENT;
}

function luminance(hex: string): number {
  const [red, green, blue] = (hex.match(/[0-9a-f]{2}/gi) ?? []).map(linearChannel);
  return RED_WEIGHT * red + GREEN_WEIGHT * green + BLUE_WEIGHT * blue;
}

function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b): number => b - a);
  return (lighter + CONTRAST_FLARE) / (darker + CONTRAST_FLARE);
}

function themeColor(color: string): string {
  const token = /var\((?<name>--[\w-]+)\)/.exec(color)?.groups?.name;
  const value = token ? new RegExp(`${token}: (?<hex>#[0-9a-f]{6});`).exec(theme)?.groups?.hex : undefined;
  if (!value) {
    throw new Error(`Badge text must use a theme color: ${color}`);
  }
  return value;
}

describe('contrastRatio', (): void => {
  it('gives the known maximum for black on white', (): void => {
    expect(contrastRatio(BLACK, WHITE)).toBe(MAXIMUM_CONTRAST);
  });
});

describe('typeBadge', (): void => {
  it.each(POKEMON_TYPES)('keeps %s badge text readable', (type): void => {
    const { background, color } = typeBadge(type);

    expect(contrastRatio(background, themeColor(color))).toBeGreaterThanOrEqual(WCAG_AA_TEXT_CONTRAST);
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
