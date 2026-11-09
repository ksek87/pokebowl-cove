import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import type { PokemonValues } from './pokemonPage.ts';

const MINIMUM_PAGES = 30;
const MAXIMUM_PAGES = 50;

async function readJson<T>(name: string): Promise<T> {
  return JSON.parse(await readFile(`evals/reference/${name}`, 'utf8')) as T;
}

describe('reference data', (): void => {
  it('holds the planned number of pages', async (): Promise<void> => {
    const pages = Object.keys(await readJson<Record<string, PokemonValues>>('pokemon.json'));

    expect(pages.length).toBeGreaterThanOrEqual(MINIMUM_PAGES);
    expect(pages.length).toBeLessThanOrEqual(MAXIMUM_PAGES);
  });

  it('matches every case verified by hand', async (): Promise<void> => {
    const reference = await readJson<Record<string, PokemonValues>>('pokemon.json');
    const { pokemon } = await readJson<{ pokemon: Record<string, PokemonValues> }>('hand-verified.json');

    expect(reference).toMatchObject(pokemon);
  });
});
