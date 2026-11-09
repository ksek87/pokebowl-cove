import { readCoveoConfig } from '../src/config.ts';
import { POKEMON_DETAIL_ONLY_FIELDS, POKEMON_FIELDS, POKEMON_STATS } from '../src/search/settings.ts';
import { buildAnswerCases, type AnswerItem } from './answerEvals.ts';
import { fetchIndexedItems, type IndexedItem } from './coveoIndex.ts';
import { buildRelevanceQueries, toEvalItem } from './relevance.ts';
import { runMain, writeEvalJson } from './runner.ts';

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function statField(label: string): string {
  return POKEMON_STATS.find((stat): boolean => stat.label === label)?.field ?? '';
}

function toAnswerItem(item: IndexedItem): AnswerItem {
  const { raw, clickUri } = item;
  return {
    ...toEvalItem(item),
    uri: clickUri,
    height: text(raw[POKEMON_DETAIL_ONLY_FIELDS.height]),
    weight: text(raw[POKEMON_DETAIL_ONLY_FIELDS.weight]),
    hp: text(raw[statField('HP')]),
    speed: text(raw[statField('Speed')]),
  };
}

/** Rebuilds the labelled sets from the live index. The results are committed and reviewed. */
async function main(): Promise<void> {
  const items = await fetchIndexedItems(readCoveoConfig(process.env));
  const named = items.filter((item): boolean => Boolean(item.raw[POKEMON_FIELDS.name]));
  const relevance = buildRelevanceQueries(named.map(toEvalItem));
  const answers = buildAnswerCases(named.map(toAnswerItem));
  await writeEvalJson('reference/relevance-queries.json', relevance);
  await writeEvalJson('reference/answer-questions.json', answers);
  console.log(JSON.stringify({ items: named.length, relevance: relevance.length, answers: answers.length }));
}

runMain(main);
