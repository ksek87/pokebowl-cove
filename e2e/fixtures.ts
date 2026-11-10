import { test as base, type Page, type Route } from '@playwright/test';

export { expect } from '@playwright/test';

export const ANSWER_STREAM_ROUTE = '**/machinelearning/streaming/**';

const STREAM_HEADERS = { 'content-type': 'text/event-stream' };

interface StreamMessage {
  payloadType: string;
  payload: string;
  finishReason?: string;
}

function headerMessage(): StreamMessage {
  return { payloadType: 'genqa.headerMessageType', payload: JSON.stringify({ contentFormat: 'text/markdown' }) };
}

function endMessage(answerGenerated: boolean): StreamMessage {
  return {
    payloadType: 'genqa.endOfStreamType',
    payload: JSON.stringify({ answerGenerated }),
    finishReason: 'COMPLETED',
  };
}

async function fulfillStream(route: Route, messages: StreamMessage[]): Promise<void> {
  await route.fulfill({
    status: 200,
    headers: STREAM_HEADERS,
    body: eventBody(messages),
  });
}

function noAnswerMessages(): StreamMessage[] {
  return [headerMessage(), endMessage(false)];
}

export async function fulfillNoAnswer(route: Route): Promise<void> {
  await fulfillStream(route, noAnswerMessages());
}

export interface StubCitation {
  title: string;
  clickUri: string;
}

function answerMessages(text: string, citation: StubCitation): StreamMessage[] {
  const citations = [
    {
      id: 'citation-1',
      title: citation.title,
      uri: citation.clickUri,
      clickUri: citation.clickUri,
      permanentid: 'citation-permanent-id',
      source: 'pokemondb-pokemon',
      text: 'Cited passage',
    },
  ];
  return [
    headerMessage(),
    { payloadType: 'genqa.messageType', payload: JSON.stringify({ textDelta: text }) },
    { payloadType: 'genqa.citationsType', payload: JSON.stringify({ citations }) },
    endMessage(true),
  ];
}

export async function stubAnswer(page: Page, text: string, citation: StubCitation): Promise<void> {
  await page.route(ANSWER_STREAM_ROUTE, async (route): Promise<void> => {
    await fulfillStream(route, answerMessages(text, citation));
  });
}

export interface HeldAnswer {
  header: () => Promise<void>;
  answer: (text: string, citation: StubCitation) => Promise<void>;
  noAnswer: () => Promise<void>;
}

declare global {
  interface Window {
    heldAnswer: { send: (body: string) => void; headerAt?: number };
  }
}

function eventBody(messages: StreamMessage[]): string {
  return messages.map((message): string => `data: ${JSON.stringify(message)}\n\n`).join('');
}

/**
 * Holds the answer stream open and lets the test send each message, so the wait before the header and before the
 * first text can be checked. A routed request can only send a whole body, so this replaces `fetch` for the stream.
 */
export async function holdAnswer(page: Page): Promise<HeldAnswer> {
  await page.addInitScript(
    ({ streamPath, headers }): void => {
      const encoder = new TextEncoder();
      const queued: string[] = [];
      let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
      window.heldAnswer = {
        send: (body): void => {
          if (body.includes('genqa.headerMessageType')) {
            window.heldAnswer.headerAt = performance.now();
          }
          if (controller) {
            controller.enqueue(encoder.encode(body));
          } else {
            queued.push(body);
          }
        },
      };
      const realFetch = window.fetch.bind(window);
      window.fetch = async (input, init): Promise<Response> => {
        const url = input instanceof Request ? input.url : String(input);
        if (!url.includes(streamPath)) {
          return realFetch(input, init);
        }
        const body = new ReadableStream<Uint8Array>({
          start: (streamController): void => {
            controller = streamController;
            queued.splice(0).forEach((text): void => streamController.enqueue(encoder.encode(text)));
          },
        });
        return new Response(body, { status: 200, headers });
      };
    },
    { streamPath: '/machinelearning/streaming/', headers: STREAM_HEADERS },
  );
  const send = async (messages: StreamMessage[]): Promise<void> => {
    await page.evaluate((body): void => window.heldAnswer.send(body), eventBody(messages));
  };
  let hasHeader = false;
  const rest = async (messages: StreamMessage[]): Promise<void> => {
    await send(hasHeader ? messages.slice(1) : messages);
    hasHeader = true;
  };
  return {
    header: async (): Promise<void> => {
      await send([headerMessage()]);
      hasHeader = true;
    },
    answer: async (text, citation): Promise<void> => rest(answerMessages(text, citation)),
    noAnswer: async (): Promise<void> => rest(noAnswerMessages()),
  };
}

/** Answers come from a limited allowance, so no browser test reads a real answer stream. */
export const test = base.extend<{ stubbedAnswers: void }>({
  stubbedAnswers: [
    async ({ page }, use): Promise<void> => {
      await page.route(ANSWER_STREAM_ROUTE, fulfillNoAnswer);
      await use();
    },
    { auto: true },
  ],
});
