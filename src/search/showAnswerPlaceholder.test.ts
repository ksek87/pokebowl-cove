import { expect, it } from 'vitest';
import { type AnswerPlaceholderState, shouldShowAnswerPlaceholder } from './showAnswerPlaceholder.ts';

type Search = NonNullable<AnswerPlaceholderState['search']>;
type Answer = NonNullable<AnswerPlaceholderState['generatedAnswer']>;

const STREAM_ID = 'stream-id';

function state(search: Partial<Search> = {}, answer: Partial<Answer> = {}): AnswerPlaceholderState {
  return {
    search: {
      isLoading: false,
      extendedResults: { generativeQuestionAnsweringId: STREAM_ID },
      ...search,
    },
    generatedAnswer: {
      isEnabled: true,
      isVisible: true,
      isLoading: false,
      isStreaming: false,
      answer: undefined,
      citations: [],
      cannotAnswer: false,
      isAnswerGenerated: false,
      error: undefined,
      ...answer,
    },
  };
}

it('shows while the answer stream is opening', (): void => {
  expect(shouldShowAnswerPlaceholder(state({}, { isLoading: true }))).toBe(true);
});

it('shows while the stream runs before any text arrives', (): void => {
  expect(shouldShowAnswerPlaceholder(state({}, { isStreaming: true }))).toBe(true);
});

it('shows between the stream header and the first text, when Headless reports neither flag', (): void => {
  expect(shouldShowAnswerPlaceholder(state())).toBe(true);
});

it('keeps showing while the answer is only whitespace, as Atomic still shows no card', (): void => {
  expect(shouldShowAnswerPlaceholder(state({}, { isStreaming: true, answer: ' \n' }))).toBe(true);
});

it.each([
  ['answer text arrives', { isStreaming: true, answer: 'Charizard is a Fire and Flying type.' }],
  ['a citation arrives', { isStreaming: true, citations: [{ id: 'citation' }] }],
  ['Coveo cannot answer', { cannotAnswer: true }],
  ['the stream ends', { isAnswerGenerated: true }],
  ['the stream fails', { isLoading: true, error: { message: 'Error opening stream' } }],
  ['answers are disabled', { isLoading: true, isEnabled: false }],
  ['the answer is hidden', { isLoading: true, isVisible: false }],
])('hides once %s', (_name, answer): void => {
  expect(shouldShowAnswerPlaceholder(state({}, answer))).toBe(false);
});

it('hides while a new search runs, because its answer has not started yet', (): void => {
  expect(shouldShowAnswerPlaceholder(state({ isLoading: true }))).toBe(false);
});

it('hides when the search response starts no answer', (): void => {
  expect(shouldShowAnswerPlaceholder(state({ extendedResults: {} }))).toBe(false);
});

it('hides before the generated answer state exists', (): void => {
  expect(shouldShowAnswerPlaceholder({})).toBe(false);
});
