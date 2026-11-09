import { AtomicGeneratedAnswer, AtomicSearchInterface } from '@coveo/atomic-react';
import {
  buildSearchEngine,
  loadAdvancedSearchQueryActions,
  loadQueryActions,
  loadSearchActions,
  loadSearchAnalyticsActions,
  type SearchEngine,
} from '@coveo/headless';
import { X } from 'lucide-react';
import { type JSX, memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
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

const THREAD_SLOT = 'ask-thread';

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
      <AtomicGeneratedAnswer />
    </AtomicSearchInterface>
  );
});

function TypingIndicator(): JSX.Element {
  return (
    <div data-slot="ask-typing" aria-hidden="true" className="flex items-center gap-2 text-muted-foreground">
      <img className="size-6" src={POKEBALL_IMAGE} alt="" />
      Thinking…
    </div>
  );
}

function AskExchange({
  config,
  name,
  question,
}: {
  config: CoveoConfig;
  name: string;
  question: string;
}): JSX.Element {
  const engine = useMemo(() => buildSearchEngine({ configuration: toEngineConfiguration(config) }), [config]);
  const [progress, setProgress] = useState<AskProgress>('waiting');
  const hasAsked = useRef(false);
  const element = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = (): void => setProgress(readAskProgress(engine.state as AskEngineState));
    return engine.subscribe(update);
  }, [engine]);

  useEffect(() => {
    const message = element.current;
    message?.closest(`[data-slot="${THREAD_SLOT}"]`)?.scrollTo({ top: message.offsetTop });
  }, []);

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
    <div ref={element} data-slot="ask-exchange" data-question={question} className="flex flex-col gap-2 last:min-h-full">
      <p
        data-slot="ask-question"
        className="max-w-[85%] self-end rounded-(--radius-control) bg-primary px-3 py-2 font-semibold text-primary-foreground"
      >
        {question}
      </p>
      {progress === 'waiting' ? <TypingIndicator /> : null}
      <AnswerInterface engine={engine} onReady={ask} />
      {progress === 'unanswered' || progress === 'failed' ? (
        <div
          data-slot="ask-message"
          className="grid justify-items-start gap-2 rounded-(--radius-control) bg-muted px-3 py-2"
        >
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
      <p data-slot="ask-status" role="status" className="sr-only">
        {PROGRESS_MESSAGES[progress]}
      </p>
    </div>
  );
}

/** Generates only when a person picks a question, because each answer takes seconds and uses the allowance. */
export function AskAboutPokemon({ config, name }: { config: CoveoConfig; name: string }): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [asked, setAsked] = useState<string[]>([]);
  const launcher = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const title = `Ask about ${name}`;
  const questions = ASK_POKEMON_QUESTIONS.map((template) => askPokemonQuestion(template, name));
  const remaining = questions.filter((question) => !asked.includes(question));

  const close = useCallback((): void => {
    setIsOpen(false);
    launcher.current?.focus();
  }, []);

  const open = (): void => {
    setHasOpened(true);
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const firstSuggestion = panel.current?.querySelector<HTMLElement>('[data-slot="ask-suggestions"] button');
    (firstSuggestion ?? panel.current?.querySelector<HTMLElement>('[data-slot="ask-close"]'))?.focus();
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        close();
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return (): void => document.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, close]);

  return (
    <>
      {hasOpened ? (
        <div
          ref={panel}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          data-slot="ask-panel"
          className={cn(
            'fixed right-(--space-chat-edge) bottom-(--space-chat-panel-bottom) z-50 h-(--size-chat-panel-height) w-(--size-chat-panel) flex-col overflow-hidden rounded-(--radius-panel) border-(length:--size-panel-border) border-border bg-card shadow-xl',
            isOpen ? 'flex' : 'hidden',
          )}
        >
          <header className="flex items-center gap-2 border-b-(length:--size-panel-border) border-border px-4 py-3">
            <img className="size-6" src={POKEBALL_IMAGE} alt="" />
            <h2 id={titleId} className="grow text-base font-extrabold">
              {title}
            </h2>
            <Button
              data-slot="ask-close"
              variant="ghost"
              size="icon"
              aria-label="Close"
              className={FOCUS_LINK_CLASS}
              onClick={close}
            >
              <X aria-hidden="true" />
            </Button>
          </header>
          <div data-slot={THREAD_SLOT} className="relative flex min-h-0 grow flex-col gap-4 overflow-y-auto p-4">
            <p className="max-w-[85%] self-start rounded-(--radius-control) bg-muted px-3 py-2">
              Hi! What would you like to know about {name}?
            </p>
            {asked.map((question) => (
              <AskExchange key={question} config={config} name={name} question={question} />
            ))}
          </div>
          {remaining.length ? (
            <div
              data-slot="ask-suggestions"
              className="grid gap-2 border-t-(length:--size-panel-border) border-border p-3"
            >
              {remaining.map((question) => (
                <Button
                  key={question}
                  variant="outline"
                  className={cn(
                    'h-auto justify-start rounded-(--radius-control) border-(length:--size-panel-border) border-border py-2 text-left font-bold whitespace-normal shadow-none',
                    FOCUS_LINK_CLASS,
                  )}
                  onClick={(): void => setAsked((current) => [...current, question])}
                >
                  {question}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <button
        ref={launcher}
        type="button"
        data-slot="ask-launcher"
        aria-label={title}
        aria-expanded={isOpen}
        className={cn(
          'fixed right-(--space-chat-edge) bottom-(--space-chat-edge) z-50 size-(--size-chat-launcher) cursor-pointer rounded-full bg-card shadow-lg',
          FOCUS_LINK_CLASS,
        )}
        onClick={isOpen ? close : open}
      >
        <img className="size-full" src={POKEBALL_IMAGE} alt="" />
      </button>
    </>
  );
}
