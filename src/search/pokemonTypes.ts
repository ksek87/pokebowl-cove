const TYPE_COLORS: Record<string, string> = {
  Normal: '#a9a58f',
  Fire: '#f2753a',
  Water: '#3d8bff',
  Electric: '#f6c927',
  Grass: '#4cb963',
  Ice: '#6fd3d6',
  Fighting: '#c8443a',
  Poison: '#9b59b6',
  Ground: '#d9a95b',
  Flying: '#8fa8f0',
  Psychic: '#f2638f',
  Bug: '#9bb52c',
  Rock: '#b59f5b',
  Ghost: '#6c5ca7',
  Dragon: '#5b55e0',
  Dark: '#4a4650',
  Steel: '#8da3b3',
  Fairy: '#f09ad0',
};

const INK_DARK = '#1e2230';
const INK_LIGHT = '#ffffff';
const FALLBACK_TYPE = 'Normal';

export const TINT_STRENGTH = 18;
const SINGLE_TYPE_FADE_STRENGTH = 7;

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

export const POKEMON_TYPES = Object.keys(TYPE_COLORS);

function colorFor(type: string): string {
  return TYPE_COLORS[type] ?? TYPE_COLORS[FALLBACK_TYPE];
}

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

export function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort(
    (a, b): number => b - a,
  );
  return (lighter + CONTRAST_FLARE) / (darker + CONTRAST_FLARE);
}

function readableInk(background: string): string {
  return contrastRatio(background, INK_DARK) >= contrastRatio(background, INK_LIGHT)
    ? INK_DARK
    : INK_LIGHT;
}

export function typeBadge(type: string): { background: string; color: string } {
  const background = colorFor(type);
  return { background, color: readableInk(background) };
}

function tint(color: string, strength: number): string {
  return `color-mix(in srgb, ${color} ${strength}%, #ffffff)`;
}

export function cardTint(types: string[]): string {
  const [firstType = FALLBACK_TYPE, secondType] = types;
  const start = tint(colorFor(firstType), TINT_STRENGTH);
  const end = secondType
    ? tint(colorFor(secondType), TINT_STRENGTH)
    : tint(colorFor(firstType), SINGLE_TYPE_FADE_STRENGTH);
  return `linear-gradient(to bottom right, ${start}, ${end})`;
}

export function readTypes(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  return typeof value === 'string' ? [value] : [];
}
