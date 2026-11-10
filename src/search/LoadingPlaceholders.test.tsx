import type { SearchEngine } from '@coveo/headless';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AnswerPlaceholder } from './LoadingPlaceholders.tsx';
import { ANSWER_PLACEHOLDER_PAUSE_MS } from './settings.ts';
import type { AnswerPlaceholderState } from './showAnswerPlaceholder.ts';

const PLACEHOLDER = '[data-slot="answer-placeholder"]';
const OPENING = '[data-slot="answer-placeholder-opening"]';
// The longest time from header to end that a stream with no answer took on live Coveo.
const HEADER_TO_END_MS = 13;
// Longer than any measured wait for a stream's header.
const LONG_WAIT_MS = 2000;
const ONE_MS = 1;

beforeEach((): void => {
  vi.useFakeTimers();
});

afterEach((): void => {
  vi.useRealTimers();
});

function wait(ms: number): void {
  act((): void => {
    vi.advanceTimersByTime(ms);
  });
}

function renderShown(engine: SearchEngine): ReturnType<typeof render> {
  const rendered = render(<AnswerPlaceholder engine={engine} />);
  wait(ANSWER_PLACEHOLDER_PAUSE_MS);
  return rendered;
}

function answerState(answer: Partial<NonNullable<AnswerPlaceholderState['generatedAnswer']>>): AnswerPlaceholderState {
  return {
    search: { isLoading: false, extendedResults: { generativeQuestionAnsweringId: 'stream-id' } },
    generatedAnswer: {
      isEnabled: true,
      isVisible: true,
      isLoading: false,
      isStreaming: false,
      citations: [],
      cannotAnswer: false,
      isAnswerGenerated: false,
      ...answer,
    },
  };
}

function fakeEngine(initial: AnswerPlaceholderState): { engine: SearchEngine; update: (next: AnswerPlaceholderState) => void } {
  const listeners = new Set<() => void>();
  const engine = {
    state: initial,
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return (): void => {
        listeners.delete(listener);
      };
    },
  };
  return {
    engine: engine as unknown as SearchEngine,
    update: (next): void => {
      engine.state = next;
      act((): void => listeners.forEach((listener): void => listener()));
    },
  };
}

it('says an answer is being generated while Coveo prepares one', (): void => {
  const { engine } = fakeEngine(answerState({}));
  const { container } = renderShown(engine);

  expect(container.querySelector(PLACEHOLDER)).toHaveTextContent('Generating an answer…');
});

it('leaves the announcement to Atomic, which already reports that an answer is generating', (): void => {
  const { engine } = fakeEngine(answerState({}));
  const { container } = renderShown(engine);

  expect(container.querySelector(OPENING)).toHaveAttribute('aria-hidden', 'true');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('pulses only the skeleton lines, and stops when reduced motion is requested', (): void => {
  const { engine } = fakeEngine(answerState({}));
  const { container } = renderShown(engine);

  const lines = container.querySelectorAll('[data-slot="answer-placeholder-line"]');
  expect(lines.length).toBeGreaterThan(0);
  lines.forEach((line): void => {
    expect(line).toHaveClass('animate-pulse', 'motion-reduce:animate-none');
  });
  expect(container.querySelector(PLACEHOLDER)).not.toHaveClass('animate-pulse');
});

it('disappears when the first answer text arrives', (): void => {
  const { engine, update } = fakeEngine(answerState({}));
  const { container } = renderShown(engine);

  update(answerState({ isStreaming: true, answer: 'Charizard is a Fire and Flying type.' }));

  expect(container.querySelector(PLACEHOLDER)).not.toBeInTheDocument();
});

it('renders nothing when no answer is being prepared', (): void => {
  const { engine } = fakeEngine(answerState({ cannotAnswer: true }));
  const { container } = renderShown(engine);

  expect(container).toBeEmptyDOMElement();
});

it('waits for the pause after the stream header before it shows', (): void => {
  const { engine } = fakeEngine(answerState({}));
  const { container } = render(<AnswerPlaceholder engine={engine} />);

  wait(ANSWER_PLACEHOLDER_PAUSE_MS - ONE_MS);
  expect(container.querySelector(PLACEHOLDER)).not.toBeInTheDocument();

  wait(ONE_MS);
  expect(container.querySelector(PLACEHOLDER)).toBeInTheDocument();
});

it('never shows while the stream is still opening', (): void => {
  const { engine } = fakeEngine(answerState({ isLoading: true }));
  const { container } = render(<AnswerPlaceholder engine={engine} />);

  wait(LONG_WAIT_MS);

  expect(container).toBeEmptyDOMElement();
});

it('never shows when the stream ends right after its header, as it does when there is no answer', (): void => {
  const { engine, update } = fakeEngine(answerState({ isLoading: true }));
  const { container } = render(<AnswerPlaceholder engine={engine} />);

  wait(LONG_WAIT_MS);
  update(answerState({}));
  wait(HEADER_TO_END_MS);
  update(answerState({ cannotAnswer: true }));
  wait(ANSWER_PLACEHOLDER_PAUSE_MS);

  expect(container).toBeEmptyDOMElement();
});

it('restarts the pause for a new search', (): void => {
  const { engine, update } = fakeEngine(answerState({}));
  const { container } = render(<AnswerPlaceholder engine={engine} />);
  const newSearch = answerState({});

  wait(ANSWER_PLACEHOLDER_PAUSE_MS - ONE_MS);
  update({ ...newSearch, search: { isLoading: true, extendedResults: {} } });
  update(newSearch);
  wait(ONE_MS);
  expect(container.querySelector(PLACEHOLDER)).not.toBeInTheDocument();

  wait(ANSWER_PLACEHOLDER_PAUSE_MS - ONE_MS);
  expect(container.querySelector(PLACEHOLDER)).toBeInTheDocument();
});

it('hides at once, with no closing animation, when a new search starts', (): void => {
  const { engine, update } = fakeEngine(answerState({}));
  const { container } = renderShown(engine);

  update({ ...answerState({}), search: { isLoading: true, extendedResults: {} } });

  expect(container).toBeEmptyDOMElement();
});

it('stops its timer when it unmounts', (): void => {
  const { engine } = fakeEngine(answerState({}));
  const { unmount } = render(<AnswerPlaceholder engine={engine} />);

  unmount();

  expect(vi.getTimerCount()).toBe(0);
});

it('opens with a height and fade animation, only when motion is allowed', (): void => {
  const { engine } = fakeEngine(answerState({}));
  const { container } = renderShown(engine);

  const opening = container.querySelector(OPENING);
  expect(opening).toHaveClass('grid', 'grid-rows-[1fr]', 'motion-safe:animate-answer-open');
  expect(opening).not.toHaveClass('animate-answer-open');
  const clip = opening?.firstElementChild;
  expect(clip).toHaveClass('min-h-0', 'overflow-hidden');
  expect(clip?.firstElementChild).toBe(container.querySelector(PLACEHOLDER));
});
