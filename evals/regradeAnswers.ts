import { regradeReport, type AnswerCase, type SavedAnswerReport } from './answerEvals.ts';
import { readEvalJson, runMain, writeEvalJson } from './runner.ts';

/** process.argv starts with the node binary and the script path. */
const FIRST_ARGUMENT = 2;
const SUMMARY_INDENT = 1;

/**
 * Grades a saved answer report again with the current cases and grader, without calling Coveo.
 * Usage: node evals/regradeAnswers.ts <report in evals/> <output in evals/>
 */
async function main(): Promise<void> {
  const [input, output] = process.argv.slice(FIRST_ARGUMENT);
  if (!input || !output) {
    throw new Error('Usage: node evals/regradeAnswers.ts <report> <output>, both relative to evals/.');
  }
  const cases = await readEvalJson<AnswerCase[]>('reference/answer-questions.json');
  const regraded = regradeReport(await readEvalJson<SavedAnswerReport>(input), cases);
  await writeEvalJson(output, regraded);
  console.log(JSON.stringify({ overall: regraded.overall, byCategory: regraded.byCategory, style: regraded.style }, null, SUMMARY_INDENT));
}

runMain(main);
