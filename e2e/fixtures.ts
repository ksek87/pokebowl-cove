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
    body: messages.map((message): string => `data: ${JSON.stringify(message)}\n\n`).join(''),
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
  answer: (text: string, citation: StubCitation) => void;
  noAnswer: () => void;
}

/** Holds the answer stream open until the test releases it, so the wait before the first text can be checked. */
export async function holdAnswer(page: Page): Promise<HeldAnswer> {
  let release: (messages: StreamMessage[]) => void = (): void => undefined;
  const released = new Promise<StreamMessage[]>((resolve): void => {
    release = resolve;
  });
  await page.route(ANSWER_STREAM_ROUTE, async (route): Promise<void> => {
    await fulfillStream(route, await released);
  });
  return {
    answer: (text, citation): void => release(answerMessages(text, citation)),
    noAnswer: (): void => release(noAnswerMessages()),
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
