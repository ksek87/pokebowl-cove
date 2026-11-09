import { AtomicGeneratedAnswer, AtomicSearchInterface } from '@coveo/atomic-react';
import {
  buildSearchEngine,
  loadAdvancedSearchQueryActions,
  loadQueryActions,
  loadSearchActions,
  loadSearchAnalyticsActions,
  type SearchEngine,
} from '@coveo/headless';
import { type JSX, memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CoveoConfig } from '../config.ts';
import { type AskEngineState, type AskProgress, readAskProgress } from './askProgress.ts';
import { CONTROL_BUTTON_CLASS, FOCUS_LINK_CLASS } from './controlStyles.ts';
import { toEngineConfiguration } from './engine.ts';
import { askPokemonQuestion, exactNameExpression } from './pokemonDetail.ts';
import { ASK_POKEMON_QUESTIONS, POKEBALL_IMAGE } from './settings.ts';

const PROGRESS_MESSAGES: Record<AskProgress, string> = {
  waiting: 'Generating an answer…',
  answered: 'Answer ready.',
  unanswered: 'No answer is available for this question. Try another question.',
  failed: 'The answer could not be loaded.',
};

const FIRST_QUESTION_SELECTOR = '[data-slot="ask-questions"] button';

function runSearch(engine: SearchEngine): void {
  const { executeSearch } = loadSearchActions(engine);
  const { logSearchboxSubmit } = loadSearchAnalyticsActions(engine);
  engine.dispatch(executeSearch(logSearchboxSubmit()));
}

/** Memoized so that a progress change never initializes the interface again. */
const AnswerInterface = memo(function AnswerInterface({
  engine,
  onReady,
}: {
  engine: SearchEngine;
  onReady: () => Promise<void>;
}): JSX.Element {
  return (
    <AtomicSearchInterface engine={engine} reflectStateInUrl={false} onReady={onReady}>
      <AtomicGeneratedAnswer collapsible />
    </AtomicSearchInterface>
  );
});

/** Each asked question mounts a new engine, so an earlier answer can never remain visible. */
function AskAnswer({
  config,
  name,
  question,
  progress,
  onProgress,
}: {
  config: CoveoConfig;
  name: string;
  question: string;
  progress: AskProgress;
  onProgress: (next: AskProgress) => void;
}): JSX.Element {
  const engine = useMemo(() => buildSearchEngine({ configuration: toEngineConfiguration(config) }), [config]);
  const hasAsked = useRef(false);

  useEffect(
    () => engine.subscribe((): void => onProgress(readAskProgress(engine.state as AskEngineState))),
    [engine, onProgress],
  );

  const ask = useCallback(async (): Promise<void> => {
    if (hasAsked.current) {
      return;
    }
    hasAsked.current = true;
    const { updateQuery } = loadQueryActions(engine);
    const { updateAdvancedSearchQueries } = loadAdvancedSearchQueryActions(engine);
    engine.dispatch(updateQuery({ q: question }));
    engine.dispatch(updateAdvancedSearchQueries({ aq: exactNameExpression(name) }));
    runSearch(engine);
  }, [engine, name, question]);

  return (
    <>
      {progress === 'waiting' ? (
        <p data-slot="ask-thinking" className="font-semibold text-muted-foreground">
          Thinking…
        </p>
      ) : null}
      <AnswerInterface engine={engine} onReady={ask} />
      {progress === 'unanswered' || progress === 'failed' ? (
        <div data-slot="ask-message" className="grid justify-items-start gap-2 font-semibold">
          {PROGRESS_MESSAGES[progress]}
          {progress === 'failed' ? (
            <Button
              variant="outline"
              className={cn(CONTROL_BUTTON_CLASS, FOCUS_LINK_CLASS)}
              onClick={(): void => runSearch(engine)}
            >
              Try again
            </Button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

type BubbleSide = 'below' | 'above';

/** The bubble extends down from the Pokéball, or up when more room is above, so it stays on screen after scrolling. */
function readSide(anchor: DOMRect): BubbleSide {
  return window.innerHeight - anchor.top >= anchor.bottom ? 'below' : 'above';
}

function pathIncludes(event: Event, element: Element | null): boolean {
  return element !== null && event.composedPath().includes(element);
}

/** Generates only when a person picks a question, because each answer takes seconds and uses the allowance. */
export function AskAboutPokemon({ config, name }: { config: CoveoConfig; name: string }): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [asked, setAsked] = useState<{ question: string; attempt: number } | null>(null);
  const [progress, setProgress] = useState<AskProgress>('waiting');
  const launcher = useRef<HTMLButtonElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const backLink = useRef<HTMLButtonElement>(null);
  const attempts = useRef(0);
  const title = `Ask about ${name}`;
  const questions = ASK_POKEMON_QUESTIONS.map((template) => askPokemonQuestion(template, name));
  const [side, setSide] = useState<BubbleSide>('below');
  const isThinking = asked !== null && progress === 'waiting';

  const close = useCallback((): void => {
    setIsOpen(false);
    launcher.current?.focus();
  }, []);

  const askQuestion = (question: string): void => {
    attempts.current += 1;
    setProgress('waiting');
    setAsked({ question, attempt: attempts.current });
  };

  useLayoutEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const place = (): void => {
      if (launcher.current) {
        setSide(readSide(launcher.current.getBoundingClientRect()));
      }
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, { passive: true });
    return (): void => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      (asked ? backLink.current : bubble.current?.querySelector<HTMLElement>(FIRST_QUESTION_SELECTOR))?.focus();
    }
  }, [isOpen, asked]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        close();
      }
    };
    const closeOnOutsideClick = (event: MouseEvent): void => {
      if (!pathIncludes(event, bubble.current) && !pathIncludes(event, launcher.current)) {
        close();
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('click', closeOnOutsideClick);
    return (): void => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('click', closeOnOutsideClick);
    };
  }, [isOpen, close]);

  return (
    <div data-slot="ask-anchor" aria-live="off" className="relative shrink-0">
      {isOpen || asked ? (
        <div
          ref={bubble}
          role="dialog"
          aria-modal="false"
          aria-label={title}
          data-slot="ask-bubble"
          data-side={side}
          className={cn(
            'absolute right-full z-50 mr-(--space-ask-bubble-gap) w-(--size-ask-bubble) flex-col rounded-(--radius-panel) border-(length:--size-panel-border) border-border bg-card text-sm shadow-xl',
            side === 'below' ? 'top-0' : 'bottom-0',
            isOpen ? 'flex' : 'hidden',
          )}
        >
          <div
            data-slot="ask-content"
            className={cn(
              'grid gap-2 rounded-(--radius-panel)',
              !asked && 'p-3',
              asked && progress !== 'answered' && 'p-(--space-ask-answer-inset)',
            )}
          >
            {asked ? (
              <AskAnswer
                key={asked.attempt}
                config={config}
                name={name}
                question={asked.question}
                progress={progress}
                onProgress={setProgress}
              />
            ) : (
              <div data-slot="ask-questions" className="grid gap-2">
                {questions.map((question) => (
                  <Button
                    key={question}
                    variant="outline"
                    className={cn(
                      'h-auto justify-start rounded-(--radius-control) border-(length:--size-panel-border) border-border py-2 text-left font-bold whitespace-normal shadow-none',
                      FOCUS_LINK_CLASS,
                    )}
                    onClick={(): void => askQuestion(question)}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            )}
          </div>
          {asked ? (
            <div className="px-(--space-ask-answer-inset) py-2">
              <button
                ref={backLink}
                type="button"
                className={cn('cursor-pointer rounded-sm text-xs font-bold text-primary underline', FOCUS_LINK_CLASS)}
                onClick={(): void => setAsked(null)}
              >
                Ask something else
              </button>
            </div>
          ) : null}
          <span
            data-slot="ask-tail"
            aria-hidden="true"
            className={cn(
              '-right-(--size-ask-tail-offset) absolute size-(--size-ask-tail) rotate-45 border-t-(length:--size-panel-border) border-r-(length:--size-panel-border) border-border bg-card',
              side === 'below' ? 'top-(--space-ask-tail)' : 'bottom-(--space-ask-tail)',
            )}
          />
        </div>
      ) : null}
      <p data-slot="ask-status" role="status" className="sr-only">
        {asked ? PROGRESS_MESSAGES[progress] : ''}
      </p>
      <button
        ref={launcher}
        type="button"
        data-slot="ask-launcher"
        data-thinking={isThinking}
        aria-label={title}
        aria-expanded={isOpen}
        className={cn(
          'block size-(--size-ask-launcher) cursor-pointer rounded-full bg-card shadow-lg',
          FOCUS_LINK_CLASS,
        )}
        onClick={isOpen ? close : (): void => setIsOpen(true)}
      >
        <img className="size-full" src={POKEBALL_IMAGE} alt="" />
      </button>
    </div>
  );
}
