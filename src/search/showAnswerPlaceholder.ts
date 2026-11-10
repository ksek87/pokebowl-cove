export interface AnswerPlaceholderState {
  search?: {
    isLoading: boolean;
    extendedResults: { generativeQuestionAnsweringId?: string };
  };
  generatedAnswer?: {
    isEnabled: boolean;
    isVisible: boolean;
    isLoading: boolean;
    isStreaming: boolean;
    answer?: string;
    citations: unknown[];
    cannotAnswer: boolean;
    isAnswerGenerated: boolean;
    error?: object;
  };
}

type SearchState = NonNullable<AnswerPlaceholderState['search']>;
type AnswerState = NonNullable<AnswerPlaceholderState['generatedAnswer']>;

function isAnswerShown({ isEnabled, isVisible }: AnswerState): boolean {
  return isEnabled && isVisible;
}

/** Atomic shows its card once the answer has text or a citation. */
function hasContent({ answer, citations }: AnswerState): boolean {
  return Boolean(answer?.trim()) || citations.some(Boolean);
}

function hasEnded({ cannotAnswer, isAnswerGenerated, error }: AnswerState): boolean {
  return cannotAnswer || isAnswerGenerated || Boolean(error);
}

/**
 * Headless clears `isLoading` when the stream's first message, its header, arrives. A stream with no answer ends
 * right after its header, so waiting for the header keeps the placeholder from flashing on those searches.
 */
function hasHeader({ isLoading }: AnswerState): boolean {
  return !isLoading;
}

/**
 * Headless sets neither `isLoading` nor `isStreaming` between the stream's header and its first text, so the stream
 * ID from the search response covers that gap.
 */
function isOpen(search: SearchState, answer: AnswerState): boolean {
  return answer.isStreaming || Boolean(search.extendedResults.generativeQuestionAnsweringId);
}

/** True once Coveo's answer stream has sent its header and Atomic shows no answer yet. */
export function shouldShowAnswerPlaceholder({ search, generatedAnswer: answer }: AnswerPlaceholderState): boolean {
  if (!search || !answer || search.isLoading || !isAnswerShown(answer)) {
    return false;
  }
  return !hasContent(answer) && !hasEnded(answer) && hasHeader(answer) && isOpen(search, answer);
}
