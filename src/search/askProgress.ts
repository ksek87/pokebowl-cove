export type AskProgress = 'waiting' | 'answered' | 'unanswered' | 'failed';

export interface AskEngineState {
  search?: {
    isLoading: boolean;
    error: object | null;
    response: { searchUid: string; extendedResults: { generativeQuestionAnsweringId?: string } };
  };
  generatedAnswer?: { answer?: string; cannotAnswer?: boolean; error?: object };
}

/** Text already received counts as an answer, and a running search always counts as waiting, so a retry clears a failure. */
export function readAskProgress({ search, generatedAnswer }: AskEngineState): AskProgress {
  if (search?.isLoading) {
    return 'waiting';
  }
  if (generatedAnswer?.answer) {
    return 'answered';
  }
  if (search?.error || generatedAnswer?.error) {
    return 'failed';
  }
  const finishedWithoutAnswer =
    search?.response.searchUid && !search.response.extendedResults.generativeQuestionAnsweringId;
  return generatedAnswer?.cannotAnswer || finishedWithoutAnswer ? 'unanswered' : 'waiting';
}
