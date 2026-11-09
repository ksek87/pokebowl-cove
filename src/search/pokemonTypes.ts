const INK_DARK = 'var(--foreground)';
const INK_LIGHT = 'var(--card)';

// Each ink is the theme color with the higher WCAG contrast, checked in the tests.
const TYPE_STYLES: Record<string, { background: string; ink: string }> = {
  Normal: { background: '#a9a58f', ink: INK_DARK },
  Fire: { background: '#f2753a', ink: INK_DARK },
  Water: { background: '#3d8bff', ink: INK_DARK },
  Electric: { background: '#f6c927', ink: INK_DARK },
  Grass: { background: '#4cb963', ink: INK_DARK },
  Ice: { background: '#6fd3d6', ink: INK_DARK },
  Fighting: { background: '#c8443a', ink: INK_LIGHT },
  Poison: { background: '#9b59b6', ink: INK_LIGHT },
  Ground: { background: '#d9a95b', ink: INK_DARK },
  Flying: { background: '#8fa8f0', ink: INK_DARK },
  Psychic: { background: '#f2638f', ink: INK_DARK },
  Bug: { background: '#9bb52c', ink: INK_DARK },
  Rock: { background: '#b59f5b', ink: INK_DARK },
  Ghost: { background: '#6c5ca7', ink: INK_LIGHT },
  Dragon: { background: '#5b55e0', ink: INK_LIGHT },
  Dark: { background: '#4a4650', ink: INK_LIGHT },
  Steel: { background: '#8da3b3', ink: INK_DARK },
  Fairy: { background: '#f09ad0', ink: INK_DARK },
};

const FALLBACK_TYPE = 'Normal';

export const TINT_STRENGTH = 18;
const SINGLE_TYPE_FADE_STRENGTH = 7;

export const POKEMON_TYPES = Object.keys(TYPE_STYLES);

function styleFor(type: string): { background: string; ink: string } {
  return TYPE_STYLES[type] ?? TYPE_STYLES[FALLBACK_TYPE];
}

function colorFor(type: string): string {
  return styleFor(type).background;
}

export function typeBadge(type: string): { background: string; color: string } {
  const { background, ink } = styleFor(type);
  return { background, color: ink };
}

function tint(color: string, strength: number): string {
  return `color-mix(in srgb, ${color} ${strength}%, var(--card))`;
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
