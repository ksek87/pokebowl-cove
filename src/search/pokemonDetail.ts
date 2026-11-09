import type { Result } from '@coveo/headless';
import { readTypes } from './pokemonTypes.ts';
import {
  POKEMON_DETAIL_ONLY_FIELDS,
  POKEMON_DETAIL_PARAM,
  POKEMON_FIELDS,
  POKEMON_STATS,
  UNKNOWN_POKEDEX_NUMBER,
} from './settings.ts';

export const POKEMON_DETAIL_FIELDS = [
  ...Object.values(POKEMON_FIELDS),
  ...Object.values(POKEMON_DETAIL_ONLY_FIELDS),
  ...POKEMON_STATS.map(({ field }) => field),
];

export interface PokemonStat {
  label: string;
  value: number;
}

export interface PokemonDetail {
  name: string;
  image: string;
  number: string | null;
  generation: string;
  types: string[];
  species: string;
  height: string;
  weight: string;
  abilities: string[];
  stats: PokemonStat[];
  total: string;
  sourceUrl: string;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function pokemonDetailHref(name: string): string {
  return `/?${POKEMON_DETAIL_PARAM}=${encodeURIComponent(name)}`;
}

export function pokemonNameFromUrl(search: string): string | null {
  return new URLSearchParams(search).get(POKEMON_DETAIL_PARAM)?.trim() || null;
}

export function exactNameExpression(name: string): string {
  return `@${POKEMON_FIELDS.name}=="${name.replaceAll('"', '')}"`;
}

/** Coveo treats wildcards in the value as a match, so the returned name is checked as well. */
export function findRequestedPokemon(results: Result[], name: string): Result | undefined {
  const requested = name.toLowerCase();
  return results.find((result): boolean => text(result.raw[POKEMON_FIELDS.name]).toLowerCase() === requested);
}

function readStats(raw: Result['raw']): PokemonStat[] {
  return POKEMON_STATS.flatMap(({ field, label }) => {
    const value = text(raw[field]);
    return value && Number.isFinite(Number(value)) ? [{ label, value: Number(value) }] : [];
  });
}

export function toPokemonDetail(result: Result): PokemonDetail {
  const { raw, clickUri } = result;
  const number = text(raw[POKEMON_FIELDS.number]);

  return {
    name: text(raw[POKEMON_FIELDS.name]),
    image: text(raw[POKEMON_FIELDS.image]),
    number: number && number !== UNKNOWN_POKEDEX_NUMBER ? number : null,
    generation: text(raw[POKEMON_FIELDS.generation]),
    types: readTypes(raw[POKEMON_FIELDS.type]),
    species: text(raw[POKEMON_DETAIL_ONLY_FIELDS.species]),
    height: text(raw[POKEMON_DETAIL_ONLY_FIELDS.height]),
    weight: text(raw[POKEMON_DETAIL_ONLY_FIELDS.weight]),
    abilities: readTypes(raw[POKEMON_DETAIL_ONLY_FIELDS.abilities]),
    stats: readStats(raw),
    total: text(raw[POKEMON_DETAIL_ONLY_FIELDS.total]),
    sourceUrl: clickUri,
  };
}
