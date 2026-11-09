import { describe, expect, it } from 'vitest';
import { buildAnswerCases, gradeAnswer, summarizeAnswers, type AnswerCase, type AnswerOutcome } from './answerEvals.ts';

const URI = 'https://pokemondb.net/pokedex/charizard';
const OTHER = 'https://pokemondb.net/pokedex/pikachu';
const TOTAL = 2;

function outcome(overrides: Partial<AnswerOutcome>): AnswerOutcome {
  return {
    text: 'Charizard is Fire and Flying',
    citations: [URI],
    answerGenerated: true,
    firstTextMs: 1,
    totalMs: 2,
    ...overrides,
  };
}

const FACT: AnswerCase = { id: 'f', category: 'fact', question: 'q', facts: ['Fire', 'Flying'], citeAny: [URI] };
const NO_ANSWER = { text: '', citations: [], answerGenerated: false };

describe('gradeAnswer', (): void => {
  it('passes a fact answer with every fact and a correct citation', (): void => {
    expect(gradeAnswer(FACT, outcome({}))).toMatchObject({ passed: true, missingFacts: [], citationCorrect: true });
  });

  it('matches facts regardless of case', (): void => {
    expect(gradeAnswer(FACT, outcome({ text: 'FIRE and flying' })).passed).toBe(true);
  });

  it('fails a missing fact and lists it', (): void => {
    expect(gradeAnswer(FACT, outcome({ text: 'Fire only' }))).toMatchObject({ passed: false, missingFacts: ['Flying'] });
  });

  it('fails a wrong citation', (): void => {
    expect(gradeAnswer(FACT, outcome({ citations: [OTHER] }))).toMatchObject({ passed: false, citationCorrect: false });
  });

  it('fails when no answer came back', (): void => {
    expect(gradeAnswer(FACT, outcome(NO_ANSWER)).passed).toBe(false);
  });

  it('passes an unanswerable question only when no answer is generated', (): void => {
    const none: AnswerCase = { id: 'u', category: 'unanswerable', question: 'q', facts: [], citeAny: [] };

    expect(gradeAnswer(none, outcome(NO_ANSWER)).passed).toBe(true);
    expect(gradeAnswer(none, outcome({}))).toMatchObject({ passed: false, needsHumanReview: true });
  });

  it('requires every scoped citation to be the Pokémon, and flags quality for a person', (): void => {
    const scoped: AnswerCase = { id: 's', category: 'scoped', question: 'q', facts: [], citeAny: [URI], scope: 'x' };

    expect(gradeAnswer(scoped, outcome({}))).toMatchObject({ passed: true, needsHumanReview: true });
    expect(gradeAnswer(scoped, outcome({ citations: [URI, OTHER] })).passed).toBe(false);
  });

  it('flags judgment cases for a person', (): void => {
    const judgment: AnswerCase = { id: 'j', category: 'judgment', question: 'q', facts: ['Fire'], citeAny: [URI] };

    expect(gradeAnswer(judgment, outcome({})).needsHumanReview).toBe(true);
  });
});

describe('summarizeAnswers', (): void => {
  it('reports pass rates by category', (): void => {
    const graded = [
      { ...gradeAnswer(FACT, outcome({})), id: 'a', category: 'fact', question: 'q', firstTextMs: 1, totalMs: 2 },
      { ...gradeAnswer(FACT, outcome({ text: 'none' })), id: 'b', category: 'fact', question: 'q', firstTextMs: 1, totalMs: 2 },
    ];

    expect(summarizeAnswers(graded).byCategory.fact).toMatchObject({ total: TOTAL, passed: 1 });
  });
});

describe('buildAnswerCases', (): void => {
  const items = ['Charizard', 'Pikachu'].map((name) => ({
    name,
    uri: `https://pokemondb.net/pokedex/${name.toLowerCase()}`,
    types: ['Fire'],
    generation: 'Generation 1',
    abilities: ['Blaze'],
    species: 'Flame Pokémon',
    height: '1.7 m',
    weight: '90.5 kg',
    hp: '78',
    speed: '100',
  }));

  it('takes facts from index values and cites that page', (): void => {
    const fact = buildAnswerCases(items).find((entry): boolean => entry.question === 'What type is Charizard?');

    expect(fact).toMatchObject({ category: 'fact', facts: ['Fire'], citeAny: [items[0]?.uri] });
  });

  it('includes unanswerable, scoped and judgment questions', (): void => {
    const categories = new Set(buildAnswerCases(items).map((entry): string => entry.category));

    expect(categories).toEqual(new Set(['fact', 'unanswerable', 'scoped', 'judgment']));
  });

  it('scopes questions to one Pokémon by exact name', (): void => {
    const scoped = buildAnswerCases(items).find((entry): boolean => entry.category === 'scoped');

    expect(scoped?.scope).toContain('=="Charizard"');
  });
});
