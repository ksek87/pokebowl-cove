import { expect, it } from 'vitest';
import { readAskProgress, type AskEngineState } from './askProgress.ts';

const ANSWER_ID = 'answer-id';
const SEARCH_ID = 'search-id';

function state(overrides: {
  isLoading?: boolean;
  searchError?: object | null;
  answerId?: string;
  searchUid?: string;
  answer?: string;
  cannotAnswer?: boolean;
  answerError?: object;
}): AskEngineState {
  return {
    search: {
      isLoading: overrides.isLoading ?? false,
      error: overrides.searchError ?? null,
      response: {
        searchUid: overrides.searchUid ?? SEARCH_ID,
        extendedResults: { generativeQuestionAnsweringId: overrides.answerId ?? ANSWER_ID },
      },
    },
    generatedAnswer: {
      answer: overrides.answer,
      cannotAnswer: overrides.cannotAnswer ?? false,
      error: overrides.answerError,
    },
  };
}

it('waits while the search runs, even after an earlier failure', (): void => {
  expect(readAskProgress(state({ isLoading: true, searchError: {} }))).toBe('waiting');
});

it('waits between the search response and the first answer text', (): void => {
  expect(readAskProgress(state({}))).toBe('waiting');
});

it('reports an answer once text arrives', (): void => {
  expect(readAskProgress(state({ answer: 'Charizard flies.' }))).toBe('answered');
});

it('reports no answer when Coveo cannot answer', (): void => {
  expect(readAskProgress(state({ cannotAnswer: true }))).toBe('unanswered');
});

it('reports no answer when the search finished without requesting one', (): void => {
  expect(readAskProgress(state({ answerId: '' }))).toBe('unanswered');
});

it('still waits before any search has responded', (): void => {
  expect(readAskProgress(state({ answerId: '', searchUid: '' }))).toBe('waiting');
});

it.each([
  ['the search', { searchError: {} }],
  ['the answer stream', { answerError: {} }],
])('reports a failure from %s', (_name, overrides): void => {
  expect(readAskProgress(state(overrides))).toBe('failed');
});
