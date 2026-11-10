import { POKEMON_FIELDS } from '../src/search/settings.ts';
import { latencyStats, type LatencyStats } from './metrics.ts';

export interface AnswerItem {
  name: string;
  uri: string;
  types: string[];
  generation: string;
  abilities: string[];
  species: string;
  height: string;
  weight: string;
  hp: string;
  speed: string;
}

export interface AnswerCase {
  id: string;
  category: string;
  question: string;
  facts: string[];
  citeAny: string[];
  /** Advanced query that limits the answer to one Pokémon. */
  scope?: string;
  note?: string;
  /** Values of the Pokémon's other forms, which must not replace the base form's value. */
  otherFormValues?: string[];
}

/** Reference values that the index does not hold, read from the Pokémon pages. */
export interface FormFacts {
  baseForm: { name: string; field: 'height' | 'weight'; otherForms: string[] }[];
  weaknesses: { name: string; types: string[] }[];
}

const NO_FORM_FACTS: FormFacts = { baseForm: [], weaknesses: [] };

export interface AnswerOutcome {
  text: string;
  citations: string[];
  answerGenerated: boolean;
  firstTextMs: number | null;
  totalMs: number;
}

export interface AnswerGrade {
  passed: boolean;
  missingFacts: string[];
  citationCorrect: boolean;
  needsHumanReview: boolean;
  reason: string;
  /** Other-form values found in the answer, for base-form questions. */
  otherFormValuesShown?: string[];
}

export type GradedAnswer = AnswerGrade & {
  id: string;
  category: string;
  question: string;
  firstTextMs: number | null;
  totalMs: number;
  text?: string;
  citations?: string[];
};

const FACT_NAMES = ['Charizard', 'Pikachu', 'Bulbasaur', 'Mewtwo', 'Eevee', 'Gengar', 'Snorlax', 'Lucario'];
const SCOPED_NAMES = ['Charizard', 'Pikachu', 'Mewtwo'];
const SCOPED_QUESTIONS = [
  (name: string): string => `Describe the appearance and behavior of ${name}.`,
  (name: string): string => `What are the abilities of ${name}?`,
];

const UNANSWERABLE = [
  'Who won the 1998 World Cup?',
  'What is the capital of France?',
  'What is the current price of a Nintendo Switch?',
  'What does Charizard taste like?',
  'How do I reset my bank password?',
  "What is the phone number of Ash Ketchum's mother?",
];

const JUDGMENT: { question: string; facts: string[]; pages: string[]; note: string }[] = [
  { question: 'What does Pikachu evolve into?', facts: ['Raichu'], pages: ['Pikachu'], note: 'Evolution facts are not index fields; the chart is written as sentences since 2026-11-10.' },
  { question: 'Which Pokémon evolves into Charizard?', facts: ['Charmeleon'], pages: ['Charizard'], note: 'Evolution facts are not index fields.' },
  { question: 'Is Charizard weak to water?', facts: ['water'], pages: ['Charizard'], note: 'A correct answer needs reading, beyond naming the Type.' },
  { question: 'What is the difference between Charmander and Charmeleon?', facts: ['Charmander', 'Charmeleon'], pages: ['Charmander', 'Charmeleon'], note: 'Quality of a comparison needs a person.' },
  { question: 'How does Pikachu evolve into Alolan Raichu?', facts: ['Thunder Stone', 'Alola'], pages: ['Pikachu'], note: 'A branch in the evolution chart, written as sentences since 2026-11-10.' },
  { question: 'Which Eevee evolution uses a Water Stone?', facts: ['Vaporeon'], pages: ['Eevee'], note: 'One of eight Eevee branches, written as sentences since 2026-11-10.' },
];

function byName(items: AnswerItem[], name: string): AnswerItem | undefined {
  return items.find((item): boolean => item.name === name);
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function firstNumber(value: string): string {
  return /[\d.]+/.exec(value)?.[0] ?? value;
}

const BASE_FORM_QUESTIONS: Record<FormFacts['baseForm'][number]['field'], (name: string) => string> = {
  height: (name) => `How tall is ${name}?`,
  weight: (name) => `How much does ${name} weigh?`,
};

function formCases(items: AnswerItem[], formFacts: FormFacts): AnswerCase[] {
  const baseForm = formFacts.baseForm.flatMap(({ name, field, otherForms }): AnswerCase[] => {
    const item = byName(items, name);
    return item
      ? [{
          id: `base-${field}-${slug(name)}`,
          category: 'base-form',
          question: BASE_FORM_QUESTIONS[field](name),
          facts: [firstNumber(item[field])],
          citeAny: [item.uri],
          otherFormValues: otherForms,
        }]
      : [];
  });
  const weaknesses = formFacts.weaknesses.flatMap(({ name, types }): AnswerCase[] => {
    const item = byName(items, name);
    return item
      ? [{ id: `weakness-${slug(name)}`, category: 'fact', question: `What types is ${name} weak to?`, facts: types, citeAny: [item.uri] }]
      : [];
  });
  return [...baseForm, ...weaknesses];
}

function factCases(item: AnswerItem): AnswerCase[] {
  const citeAny = [item.uri];
  const [ability] = item.abilities;
  return [
    { id: `type-${slug(item.name)}`, category: 'fact', question: `What type is ${item.name}?`, facts: item.types, citeAny },
    { id: `species-${slug(item.name)}`, category: 'fact', question: `What species is ${item.name}?`, facts: [item.species.replace(/ Pokémon$/, '')], citeAny },
    ...(ability ? [{ id: `ability-${slug(item.name)}`, category: 'fact', question: `What abilities can ${item.name} have?`, facts: [ability], citeAny }] : []),
    { id: `height-${slug(item.name)}`, category: 'fact', question: `How tall is ${item.name}?`, facts: [firstNumber(item.height)], citeAny },
  ];
}

const FACT_QUESTIONS_PER_ITEM = 2;

export function buildAnswerCases(items: AnswerItem[], formFacts: FormFacts = NO_FORM_FACTS): AnswerCase[] {
  const facts = FACT_NAMES.flatMap((name, position): AnswerCase[] => {
    const item = byName(items, name);
    if (!item) {
      return [];
    }
    const cases = factCases(item);
    return Array.from({ length: FACT_QUESTIONS_PER_ITEM }, (_unused, offset) => cases[(position + offset) % cases.length]);
  });
  const unanswerable = UNANSWERABLE.map((question, position): AnswerCase => ({
    id: `none-${position}`,
    category: 'unanswerable',
    question,
    facts: [],
    citeAny: [],
  }));
  const scoped = SCOPED_NAMES.flatMap((name): AnswerCase[] => {
    const item = byName(items, name);
    return item
      ? SCOPED_QUESTIONS.map((build, position) => ({
          id: `scoped-${slug(name)}-${position}`,
          category: 'scoped',
          question: build(name),
          facts: [],
          citeAny: [item.uri],
          scope: `@${POKEMON_FIELDS.name}=="${name}"`,
        }))
      : [];
  });
  const judgment = JUDGMENT.map(({ question, facts: expected, pages, note }, position): AnswerCase => ({
    id: `judgment-${position}`,
    category: 'judgment',
    question,
    facts: expected,
    citeAny: pages.flatMap((name) => byName(items, name)?.uri ?? []),
    note,
  }));
  return [...facts, ...formCases(items, formFacts), ...unanswerable, ...scoped, ...judgment];
}

function sameUri(first: string, second: string): boolean {
  return first.toLowerCase().replace(/\/$/, '') === second.toLowerCase().replace(/\/$/, '');
}

function gradeUnanswerable(outcome: AnswerOutcome): AnswerGrade {
  const declined = !outcome.answerGenerated;
  return {
    passed: declined,
    missingFacts: [],
    citationCorrect: true,
    needsHumanReview: !declined,
    reason: declined ? 'No answer was generated, as expected.' : 'An answer was generated for an unanswerable question.',
  };
}

function gradeScoped(testCase: AnswerCase, outcome: AnswerOutcome): AnswerGrade {
  const inScope = outcome.citations.every((uri): boolean => testCase.citeAny.some((wanted): boolean => sameUri(uri, wanted)));
  const citationCorrect = outcome.citations.length > 0 && inScope;
  const passed = outcome.answerGenerated && citationCorrect;
  return {
    passed,
    missingFacts: [],
    citationCorrect,
    needsHumanReview: true,
    reason: passed ? 'Answered from this Pokémon only; quality needs a person.' : 'No answer, or a citation outside the Pokémon.',
  };
}

/** Finds whole numbers only, so "85.0" is not found inside "185.0". */
function shownValues(answer: string, values: string[]): string[] {
  return values.filter((value): boolean => new RegExp(`(?<![\\d.])${value.replace(/\./g, '\\.')}(?![\\d])`).test(answer));
}

export function gradeAnswer(testCase: AnswerCase, outcome: AnswerOutcome): AnswerGrade {
  if (testCase.category === 'unanswerable') {
    return gradeUnanswerable(outcome);
  }
  if (testCase.category === 'scoped') {
    return gradeScoped(testCase, outcome);
  }
  const answer = outcome.text.toLowerCase();
  const missingFacts = testCase.facts.filter((fact): boolean => !answer.includes(fact.toLowerCase()));
  const citationCorrect = outcome.citations.some((uri): boolean => testCase.citeAny.some((wanted): boolean => sameUri(uri, wanted)));
  const passed = outcome.answerGenerated && !missingFacts.length && citationCorrect;
  const grade = {
    passed,
    missingFacts,
    citationCorrect,
    needsHumanReview: testCase.category === 'judgment',
    reason: passed ? 'Every expected fact and a correct citation.' : 'Missing answer, fact or citation.',
  };
  if (!testCase.otherFormValues) {
    return grade;
  }
  const otherFormValuesShown = shownValues(answer, testCase.otherFormValues);
  if (!otherFormValuesShown.length) {
    return { ...grade, otherFormValuesShown };
  }
  return passed
    ? { ...grade, otherFormValuesShown, needsHumanReview: true, reason: 'The base value and other forms\' values; a person checks which is which.' }
    : { ...grade, otherFormValuesShown, reason: 'Gave another form\'s value in place of the base form\'s.' };
}

export function summarizeAnswers(graded: GradedAnswer[]): {
  overall: { total: number; passed: number };
  byCategory: Record<string, { total: number; passed: number; needsHumanReview: number }>;
  firstTextMs: LatencyStats | null;
  totalMs: LatencyStats | null;
} {
  const count = (entries: GradedAnswer[]): { total: number; passed: number; needsHumanReview: number } => ({
    total: entries.length,
    passed: entries.filter((entry): boolean => entry.passed).length,
    needsHumanReview: entries.filter((entry): boolean => entry.needsHumanReview).length,
  });
  const answered = graded.filter((entry): boolean => entry.firstTextMs !== null);
  const categories = [...new Set(graded.map((entry): string => entry.category))];
  return {
    overall: count(graded),
    byCategory: Object.fromEntries(
      categories.map((category) => [category, count(graded.filter((entry): boolean => entry.category === category))]),
    ),
    firstTextMs: answered.length ? latencyStats(answered.map((entry): number => entry.firstTextMs as number)) : null,
    totalMs: answered.length ? latencyStats(answered.map((entry): number => entry.totalMs)) : null,
  };
}
