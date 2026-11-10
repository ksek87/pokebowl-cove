import type { SearchEngine } from '@coveo/headless';
import { act, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { AnswerPlaceholder } from './LoadingPlaceholders.tsx';
import type { AnswerPlaceholderState } from './showAnswerPlaceholder.ts';

const PLACEHOLDER = '[data-slot="answer-placeholder"]';

function answerState(answer: Partial<NonNullable<AnswerPlaceholderState['generatedAnswer']>>): AnswerPlaceholderState {
  return {
    search: { isLoading: false, extendedResults: { generativeQuestionAnsweringId: 'stream-id' } },
    generatedAnswer: {
      isEnabled: true,
      isVisible: true,
      isLoading: true,
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
  const { container } = render(<AnswerPlaceholder engine={engine} />);

  expect(container.querySelector(PLACEHOLDER)).toHaveTextContent('Generating an answer…');
});

it('leaves the announcement to Atomic, which already reports that an answer is generating', (): void => {
  const { engine } = fakeEngine(answerState({}));
  const { container } = render(<AnswerPlaceholder engine={engine} />);

  expect(container.querySelector(PLACEHOLDER)).toHaveAttribute('aria-hidden', 'true');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('pulses only the skeleton lines, and stops when reduced motion is requested', (): void => {
  const { engine } = fakeEngine(answerState({}));
  const { container } = render(<AnswerPlaceholder engine={engine} />);

  const lines = container.querySelectorAll('[data-slot="answer-placeholder-line"]');
  expect(lines.length).toBeGreaterThan(0);
  lines.forEach((line): void => {
    expect(line).toHaveClass('animate-pulse', 'motion-reduce:animate-none');
  });
  expect(container.querySelector(PLACEHOLDER)).not.toHaveClass('animate-pulse');
});

it('disappears when the first answer text arrives', (): void => {
  const { engine, update } = fakeEngine(answerState({}));
  const { container } = render(<AnswerPlaceholder engine={engine} />);

  update(answerState({ isLoading: false, isStreaming: true, answer: 'Charizard is a Fire and Flying type.' }));

  expect(container.querySelector(PLACEHOLDER)).not.toBeInTheDocument();
});

it('renders nothing when no answer is being prepared', (): void => {
  const { engine } = fakeEngine(answerState({ isLoading: false, cannotAnswer: true }));
  const { container } = render(<AnswerPlaceholder engine={engine} />);

  expect(container).toBeEmptyDOMElement();
});
