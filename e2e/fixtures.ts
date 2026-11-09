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

export async function fulfillNoAnswer(route: Route): Promise<void> {
  await fulfillStream(route, [headerMessage(), endMessage(false)]);
}

export interface StubCitation {
  title: string;
  clickUri: string;
}

export async function stubAnswer(page: Page, text: string, citation: StubCitation): Promise<void> {
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
  await page.route(ANSWER_STREAM_ROUTE, async (route): Promise<void> => {
    await fulfillStream(route, [
      headerMessage(),
      { payloadType: 'genqa.messageType', payload: JSON.stringify({ textDelta: text }) },
      { payloadType: 'genqa.citationsType', payload: JSON.stringify({ citations }) },
      endMessage(true),
    ]);
  });
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
