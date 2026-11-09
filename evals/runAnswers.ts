import { readCoveoConfig, type CoveoConfig } from '../src/config.ts';
import { gradeAnswer, summarizeAnswers, type AnswerCase, type AnswerOutcome, type GradedAnswer } from './answerEvals.ts';
import { readAnswerStream, timedSearch } from './coveoQueries.ts';
import { pause, readEvalJson, runMain, writeEvalJson } from './runner.ts';

/** RGA is throttled at 2 queries per second, so stay far below that, one at a time. */
const PACING_MS = 3000;

const NO_ANSWER: Omit<AnswerOutcome, 'totalMs'> = { text: '', citations: [], answerGenerated: false, firstTextMs: null };

async function ask(config: CoveoConfig, testCase: AnswerCase): Promise<AnswerOutcome> {
  const startedAt = performance.now();
  const { response } = await timedSearch(config, { q: testCase.question, aq: testCase.scope, generative: true });
  const streamId = response.extendedResults?.generativeQuestionAnsweringId;
  if (!streamId) {
    return { ...NO_ANSWER, totalMs: performance.now() - startedAt };
  }
  return readAnswerStream(config, { streamId, startedAt });
}

async function main(): Promise<void> {
  const config = readCoveoConfig(process.env);
  const cases = await readEvalJson<AnswerCase[]>('reference/answer-questions.json');
  const graded: GradedAnswer[] = [];
  for (const testCase of cases) {
    const outcome = await ask(config, testCase);
    graded.push({
      ...gradeAnswer(testCase, outcome),
      id: testCase.id,
      category: testCase.category,
      question: testCase.question,
      firstTextMs: outcome.firstTextMs,
      totalMs: outcome.totalMs,
      text: outcome.text,
      citations: outcome.citations,
    });
    await pause(PACING_MS);
  }
  const summary = summarizeAnswers(graded);
  await writeEvalJson('reports/answers.json', {
    measuredAt: new Date().toISOString(),
    method: 'Times run from sending the search to the first answer text and to stream end, sequentially, with analytics capture off.',
    ...summary,
    graded,
  });
  console.log(JSON.stringify(summary, null, 1));
}

runMain(main);
