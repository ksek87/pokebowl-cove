import { POKEMON_DETAIL_ONLY_FIELDS, POKEMON_FIELDS } from '../src/search/settings.ts';
import type { IndexedItem } from './coveoIndex.ts';
import { recallAtK, reciprocalRank } from './metrics.ts';

export interface EvalItem {
  name: string;
  types: string[];
  generation: string;
  abilities: string[];
  species: string;
}

export interface RelevanceQuery {
  query: string;
  category: string;
  relevant: string[];
  /** Set when the expected results rest on a human choice rather than an index value. */
  judgment?: string;
}

export interface QueryScore {
  query: string;
  category: string;
  judgment?: string;
  ranked: string[];
  reciprocalRank: number;
  recall: Record<number, number>;
}

interface Aggregate {
  queries: number;
  mrr: number;
  recall: Record<number, number>;
}

const NAME_SAMPLE = 25;
const ABILITY_SAMPLE = 15;
const SPECIES_SAMPLE = 15;
const PAIR_SAMPLE = 8;
const PARTIAL_SAMPLE = 12;
const NATURAL_SAMPLE = 8;
const PREFIX_LENGTH = 4;
export const TYPE_QUERY_SUFFIX = ' type';

/** Names that punctuation or spelling makes hard, kept in when the index has them. */
const DIFFICULT_NAMES = ['Mr. Mime', "Farfetch'd", 'Nidoran♀', 'Type: Null', 'Porygon2', 'Ho-Oh'];
const HARD_PREFIXES = ['char', 'pika', 'bulba', 'mew'];

const DESCRIPTIVE: { query: string; type: string; speciesWord: string }[] = [
  { query: 'electric mouse pokemon', type: 'Electric', speciesWord: 'Mouse' },
  { query: 'fire fox', type: 'Fire', speciesWord: 'Fox' },
  { query: 'water turtle', type: 'Water', speciesWord: 'Turtle' },
  { query: 'psychic cat', type: 'Psychic', speciesWord: 'Cat' },
  { query: 'grass seed pokemon', type: 'Grass', speciesWord: 'Seed' },
  { query: 'ghost pokemon that is a gas', type: 'Ghost', speciesWord: 'Gas' },
];

function list(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  return typeof value === 'string' && value ? [value] : [];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function toEvalItem({ raw }: IndexedItem): EvalItem {
  return {
    name: text(raw[POKEMON_FIELDS.name]),
    types: list(raw[POKEMON_FIELDS.type]),
    generation: text(raw[POKEMON_FIELDS.generation]),
    abilities: list(raw[POKEMON_DETAIL_ONLY_FIELDS.abilities]),
    species: text(raw[POKEMON_DETAIL_ONLY_FIELDS.species]),
  };
}

export function spread<T>(values: T[], size: number): T[] {
  if (values.length <= size) {
    return values;
  }
  const step = values.length / size;
  return Array.from({ length: size }, (_unused, slot): T => values[Math.floor(slot * step)]);
}

export function unique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b): number => a.localeCompare(b, 'en', { numeric: true }));
}

function namesWhere(items: EvalItem[], test: (item: EvalItem) => boolean): string[] {
  return items.filter(test).map((item): string => item.name);
}

function nameQueries(items: EvalItem[]): RelevanceQuery[] {
  const names = items.map((item): string => item.name);
  const hard = DIFFICULT_NAMES.filter((name): boolean => names.includes(name));
  return [...new Set([...spread(names, NAME_SAMPLE), ...hard])].map((name) => ({
    query: name,
    category: 'name',
    relevant: [name],
  }));
}

function valueQueries(items: EvalItem[]): RelevanceQuery[] {
  const types = unique(items.flatMap((item): string[] => item.types));
  const generations = unique(items.map((item): string => item.generation).filter(Boolean));
  const abilities = spread(unique(items.flatMap((item): string[] => item.abilities)), ABILITY_SAMPLE);
  const species = spread(unique(items.map((item): string => item.species).filter(Boolean)), SPECIES_SAMPLE);
  return [
    ...types.map((type) => ({
      query: `${type.toLowerCase()}${TYPE_QUERY_SUFFIX}`,
      category: 'type',
      relevant: namesWhere(items, (item): boolean => item.types.includes(type)),
    })),
    ...generations.map((generation) => ({
      query: generation.toLowerCase(),
      category: 'generation',
      relevant: namesWhere(items, (item): boolean => item.generation === generation),
    })),
    ...abilities.map((ability) => ({
      query: ability,
      category: 'ability',
      relevant: namesWhere(items, (item): boolean => item.abilities.includes(ability)),
    })),
    ...species.map((value) => ({
      query: value,
      category: 'species',
      relevant: namesWhere(items, (item): boolean => item.species === value),
    })),
  ];
}

function partialQueries(items: EvalItem[]): RelevanceQuery[] {
  const prefixes = spread(items, PARTIAL_SAMPLE).map((item): string => item.name.slice(0, PREFIX_LENGTH).toLowerCase());
  return [...new Set([...HARD_PREFIXES, ...prefixes])].flatMap((prefix) => {
    const relevant = namesWhere(items, (item): boolean => item.name.toLowerCase().startsWith(prefix));
    return relevant.length ? [{ query: prefix, category: 'partial', relevant }] : [];
  });
}

function pairQueries(items: EvalItem[]): RelevanceQuery[] {
  const pairs = unique(items.filter((item): boolean => item.types.length > 1).map((item): string => item.types.join('|')));
  return spread(pairs, PAIR_SAMPLE).map((pair) => {
    const [first, second] = pair.split('|');
    return {
      query: `${first.toLowerCase()} ${second.toLowerCase()}`,
      category: 'descriptive',
      relevant: namesWhere(items, (item): boolean => item.types.includes(first) && item.types.includes(second)),
      judgment: 'A Type pair is taken to mean Pokémon with both Types.',
    };
  });
}

function descriptiveQueries(items: EvalItem[]): RelevanceQuery[] {
  return DESCRIPTIVE.flatMap(({ query, type, speciesWord }) => {
    const relevant = namesWhere(
      items,
      (item): boolean => item.types.includes(type) && item.species.includes(speciesWord),
    );
    return relevant.length
      ? [{ query, category: 'descriptive', relevant, judgment: `Hand-written query; relevant means ${type} with ${speciesWord} in its species.` }]
      : [];
  });
}

function naturalQueries(items: EvalItem[]): RelevanceQuery[] {
  return spread(items, NATURAL_SAMPLE).map(({ name }) => ({
    query: `what type is ${name}`,
    category: 'natural',
    relevant: [name],
    judgment: 'A question about one Pokémon is taken to be answered by its page.',
  }));
}

export function buildRelevanceQueries(items: EvalItem[]): RelevanceQuery[] {
  return [
    ...nameQueries(items),
    ...valueQueries(items),
    ...partialQueries(items),
    ...pairQueries(items),
    ...descriptiveQueries(items),
    ...naturalQueries(items),
  ];
}

export function scoreQuery(query: RelevanceQuery, ranked: string[], ks: number[]): QueryScore {
  return {
    query: query.query,
    category: query.category,
    ...(query.judgment && { judgment: query.judgment }),
    ranked,
    reciprocalRank: reciprocalRank(ranked, query.relevant),
    recall: Object.fromEntries(ks.map((k) => [k, recallAtK(ranked, query.relevant, k)])),
  };
}

function aggregate(scores: QueryScore[], ks: number[]): Aggregate {
  const mean = (read: (score: QueryScore) => number): number =>
    scores.reduce((sum, score): number => sum + read(score), 0) / scores.length;
  return {
    queries: scores.length,
    mrr: mean((score): number => score.reciprocalRank),
    recall: Object.fromEntries(ks.map((k) => [k, mean((score): number => score.recall[k])])),
  };
}

export function summarizeRelevance(
  scores: QueryScore[],
  ks: number[],
): { overall: Aggregate; byCategory: Record<string, Aggregate>; failures: QueryScore[] } {
  const categories = [...new Set(scores.map((score): string => score.category))];
  return {
    overall: aggregate(scores, ks),
    byCategory: Object.fromEntries(
      categories.map((category) => [
        category,
        aggregate(scores.filter((score): boolean => score.category === category), ks),
      ]),
    ),
    failures: scores.filter((score): boolean => !score.reciprocalRank),
  };
}
