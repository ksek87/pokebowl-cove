import { describe, expect, it } from 'vitest';
import {
  ANSWER_STYLE_LIMITS,
  answerStyle,
  buildAnswerCases,
  gradeAnswer,
  regradeReport,
  summarizeAnswers,
  type AnswerCase,
  type AnswerOutcome,
  type FormFacts,
  type GradedAnswer,
} from './answerEvals.ts';

const URI = 'https://pokemondb.net/pokedex/charizard';
const OTHER = 'https://pokemondb.net/pokedex/pikachu';
const TOTAL = 2;
const ONE = 1;
const NONE = 0;
const WORDS_WITHOUT_MARKDOWN = 4;

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

describe('gradeAnswer for base-form questions', (): void => {
  const base: AnswerCase = {
    id: 'w',
    category: 'base-form',
    question: 'How much does Charizard weigh?',
    facts: ['90.5'],
    citeAny: [URI],
    otherFormValues: ['110.5', '100.5'],
  };

  it('fails and names the value when another form is given in place of the base form', (): void => {
    const grade = gradeAnswer(base, outcome({ text: 'Charizard weighs 110.5 kg (243.6 lbs).' }));

    expect(grade).toMatchObject({ passed: false, otherFormValuesShown: ['110.5'] });
    expect(grade.reason).toContain('another form');
  });

  it('passes the base value alone', (): void => {
    expect(gradeAnswer(base, outcome({ text: 'Charizard weighs 90.5 kg.' }))).toMatchObject({ passed: true, otherFormValuesShown: [] });
  });

  it('passes the base value given with other forms, and asks a person to check it', (): void => {
    const grade = gradeAnswer(base, outcome({ text: 'Charizard weighs 90.5 kg; Mega Charizard X weighs 110.5 kg.' }));

    expect(grade).toMatchObject({ passed: true, needsHumanReview: true, otherFormValuesShown: ['110.5'] });
  });

  it('matches whole numbers only, so 85.0 is not found inside 185.0', (): void => {
    const tauros: AnswerCase = { ...base, facts: ['88.4'], otherFormValues: ['85.0'] };

    expect(gradeAnswer(tauros, outcome({ text: 'It weighs 185.0 kg.' })).otherFormValuesShown).toEqual([]);
  });
});

describe('gradeAnswer for wrong weaknesses', (): void => {
  const weakness: AnswerCase = {
    id: 'weakness-charizard',
    category: 'fact',
    question: 'What types is Charizard weak to?',
    facts: ['Rock', 'Water'],
    citeAny: [URI],
    wrongWeaknesses: ['Fire', 'Grass', 'Bug', 'Ground'],
  };

  it('fails an answer that lists a resisted type as a weakness, and names it', (): void => {
    const text = 'Charizard is weak to:\n- **Rock**: takes 4x damage from Rock.\n- **Water**: 2x.\n- **Grass**: takes 4x damage from Grass.\n- **Bug**: takes 4x damage from Bug.';
    const grade = gradeAnswer(weakness, outcome({ text }));

    expect(grade).toMatchObject({ passed: false, wrongWeaknessesShown: ['Grass', 'Bug'] });
    expect(grade.reason).toContain('resists');
  });

  it('passes an answer that names resisted types as resistances', (): void => {
    const text = 'Charizard is weak to Rock (4x) and Water (2x). It resists Grass and Bug at 0.25x, and Ground has no effect.';

    expect(gradeAnswer(weakness, outcome({ text }))).toMatchObject({ passed: true, wrongWeaknessesShown: [] });
  });

  it('does not count the Pokémon\'s own Type as a claimed weakness', (): void => {
    const text = 'Charizard, a Fire/Flying Pokémon, is weak to Rock and Water. As a Fire type it is weak to Water.';

    expect(gradeAnswer(weakness, outcome({ text })).passed).toBe(true);
  });
});

describe('answerStyle', (): void => {
  it('counts words without Markdown symbols', (): void => {
    expect(answerStyle('## Answer\n\n- **Charizard** is Fire/Flying.').words).toBe(WORDS_WITHOUT_MARKDOWN);
  });

  it('finds an answer that starts with a direct sentence, before any heading', (): void => {
    expect(answerStyle('**Charizard** weighs 90.5 kg.\n\n## Forms\n- Mega').directAnswerFirst).toBe(true);
    expect(answerStyle('## Weight of Charizard\n\nCharizard weighs 90.5 kg.').directAnswerFirst).toBe(false);
    expect(answerStyle('**Answer**\n\nCharizard weighs 90.5 kg.').directAnswerFirst).toBe(false);
    expect(answerStyle('- Blaze\n- Solar Power').directAnswerFirst).toBe(false);
  });

  it('finds references to the documentation, documents, sources or provided content', (): void => {
    const mentions = [
      'This is stated in the documentation.',
      'Based on the provided documentation, it is Fire.',
      'The documents list two abilities.',
      'According to the provided content, it is Fire.',
      'The sources say it is Fire.',
      'This is supported by the following documentation:',
    ];

    expect(mentions.map((text): boolean => answerStyle(text).mentionsDocumentation)).toEqual(mentions.map(() => true));
    expect(answerStyle('Charizard is a Fire/Flying type Pokémon.').mentionsDocumentation).toBe(false);
  });

  it('marks an answer longer than the named limit as long', (): void => {
    const words = (count: number): string => Array.from({ length: count }, () => 'word').join(' ');

    expect(answerStyle(words(ANSWER_STYLE_LIMITS.longAnswerWords)).long).toBe(false);
    expect(answerStyle(words(ANSWER_STYLE_LIMITS.longAnswerWords + 1)).long).toBe(true);
  });
});

describe('summarizeAnswers', (): void => {
  it('reports style counts for generated answers, by category and overall', (): void => {
    const entry = (text: string, category: string): GradedAnswer => ({
      ...gradeAnswer(FACT, outcome({ text })),
      id: text,
      category,
      question: 'q',
      firstTextMs: text ? ONE : null,
      totalMs: 2,
      text,
      style: text ? answerStyle(text) : undefined,
    });
    const summary = summarizeAnswers([
      entry('Fire and Flying, as the documentation says.', 'fact'),
      entry('## Type\n\nFire and Flying.', 'fact'),
      entry('', 'unanswerable'),
    ]);

    expect(summary.style.overall).toMatchObject({ answered: TOTAL, directAnswerFirst: ONE, mentionsDocumentation: ONE, long: NONE });
    expect(summary.style.byCategory.fact?.answered).toBe(TOTAL);
    expect(summary.style.byCategory.unanswerable?.answered).toBe(NONE);
  });

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

  const formFacts: FormFacts = {
    baseForm: [
      { name: 'Charizard', field: 'weight', otherForms: ['110.5'] },
      { name: 'Charizard', field: 'height', otherForms: ['1.8'] },
      { name: 'Missingno', field: 'weight', otherForms: ['1.0'] },
    ],
    weaknesses: [{ name: 'Charizard', types: ['Rock', 'Water'], resists: ['Fire', 'Grass'], immuneTo: ['Ground'] }],
  };

  it('asks base-form height and weight questions with the index value and the other forms to reject', (): void => {
    const cases = buildAnswerCases(items, formFacts).filter((entry): boolean => entry.category === 'base-form');

    expect(cases).toEqual([
      expect.objectContaining({
        question: 'How much does Charizard weigh?',
        facts: ['90.5'],
        otherFormValues: ['110.5'],
        citeAny: [items[0]?.uri],
      }),
      expect.objectContaining({ question: 'How tall is Charizard?', facts: ['1.7'], otherFormValues: ['1.8'] }),
    ]);
  });

  it('asks which types a Pokémon is weak to', (): void => {
    const weakness = buildAnswerCases(items, formFacts).find((entry): boolean => entry.id === 'weakness-charizard');

    expect(weakness).toMatchObject({ category: 'fact', facts: ['Rock', 'Water'], citeAny: [items[0]?.uri] });
    expect(weakness?.wrongWeaknesses).toEqual(['Fire', 'Grass', 'Ground']);
    expect(weakness?.question).toContain('weak');
  });
});

describe('regradeReport', (): void => {
  const cases: AnswerCase[] = [{ ...FACT, id: 'a', wrongWeaknesses: ['Grass'] }];

  it('grades saved answers again with the current cases, keeping timings and text', (): void => {
    const report = {
      measuredAt: 't',
      method: 'm',
      graded: [{ id: 'a', category: 'fact', question: 'q', passed: true, firstTextMs: 1, totalMs: 2, text: 'Fire and Flying; weak to Grass at 2x.', citations: [URI] }],
    };
    const regraded = regradeReport(report, cases);

    const [first] = regraded.graded;

    expect(regraded).toMatchObject({ measuredAt: 't', overall: { total: ONE, passed: NONE } });
    expect(first).toMatchObject({ id: 'a', passed: false, firstTextMs: ONE, wrongWeaknessesShown: ['Grass'] });
    expect(first?.style?.words).toBeGreaterThan(NONE);
  });

  it('treats a saved answer with no text as not generated', (): void => {
    const report = { measuredAt: 't', method: 'm', graded: [{ id: 'a', category: 'fact', question: 'q', firstTextMs: null, totalMs: 2, text: '', citations: [] }] };

    const [first] = regradeReport(report, cases).graded;

    expect(first).toMatchObject({ passed: false });
    expect(first?.style).toBeUndefined();
  });
});
