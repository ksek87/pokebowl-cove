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
 * Headless sets neither `isLoading` nor `isStreaming` between the stream's header and its first text, so the stream
 * ID from the search response covers that gap.
 */
function isPreparing(search: SearchState, answer: AnswerState): boolean {
  return answer.isLoading || answer.isStreaming || Boolean(search.extendedResults.generativeQuestionAnsweringId);
}

/** True while Coveo prepares an answer that Atomic does not show yet. */
export function shouldShowAnswerPlaceholder({ search, generatedAnswer: answer }: AnswerPlaceholderState): boolean {
  if (!search || !answer || search.isLoading || !isAnswerShown(answer)) {
    return false;
  }
  return !hasContent(answer) && !hasEnded(answer) && isPreparing(search, answer);
}
