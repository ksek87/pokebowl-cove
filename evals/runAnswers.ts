import { readCoveoConfig } from '../src/config.ts';
import { gradedEntry, summarizeAnswers, type AnswerCase, type GradedAnswer } from './answerEvals.ts';
import { ANSWER_PACING_MS, timedAnswer } from './coveoQueries.ts';
import { pause, readEvalJson, runMain, writeEvalJson } from './runner.ts';

async function main(): Promise<void> {
  const config = readCoveoConfig(process.env);
  const cases = await readEvalJson<AnswerCase[]>('reference/answer-questions.json');
  const graded: GradedAnswer[] = [];
  for (const testCase of cases) {
    const outcome = await timedAnswer(config, { q: testCase.question, aq: testCase.scope });
    graded.push(gradedEntry(testCase, outcome));
    await pause(ANSWER_PACING_MS);
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
