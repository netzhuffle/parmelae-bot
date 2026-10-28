import { describe, expect, it } from 'bun:test';

import { OpenAI } from 'openai';

import {
  observeHostedImageGenerationStream,
  withHostedImageGenerationStartHandler,
} from './HostedImageGenerationObserver.js';

async function* streamEvents(
  events: OpenAI.Responses.ResponseStreamEvent[],
): AsyncGenerator<OpenAI.Responses.ResponseStreamEvent> {
  for (const event of events) {
    yield event;
  }
}

describe('observeHostedImageGenerationStream', () => {
  it('emits the scoped callback before yielding a hosted image-generation start event', async () => {
    const order: string[] = [];
    const events: OpenAI.Responses.ResponseStreamEvent[] = [
      {
        item: {
          id: 'ig_123',
          result: null,
          status: 'in_progress',
          type: 'image_generation_call',
        },
        output_index: 0,
        sequence_number: 1,
        type: 'response.output_item.added',
      },
      {
        item_id: 'ig_123',
        output_index: 0,
        sequence_number: 2,
        type: 'response.image_generation_call.generating',
      },
    ];

    await withHostedImageGenerationStartHandler(
      () => {
        order.push('callback');
      },
      async () => {
        for await (const event of observeHostedImageGenerationStream(streamEvents(events))) {
          order.push(event.type);
        }
      },
    );

    expect(order).toEqual([
      'callback',
      'response.output_item.added',
      'response.image_generation_call.generating',
    ]);
  });

  it('also detects dedicated image-generation progress events once', async () => {
    const order: string[] = [];
    const events: OpenAI.Responses.ResponseStreamEvent[] = [
      {
        item_id: 'ig_123',
        output_index: 0,
        sequence_number: 1,
        type: 'response.image_generation_call.in_progress',
      },
      {
        item_id: 'ig_123',
        output_index: 0,
        sequence_number: 2,
        type: 'response.image_generation_call.generating',
      },
    ];

    await withHostedImageGenerationStartHandler(
      () => {
        order.push('callback');
      },
      async () => {
        for await (const event of observeHostedImageGenerationStream(streamEvents(events))) {
          order.push(event.type);
        }
      },
    );

    expect(order).toEqual([
      'callback',
      'response.image_generation_call.in_progress',
      'response.image_generation_call.generating',
    ]);
  });

  it('does not emit without a scoped handler', async () => {
    const events: OpenAI.Responses.ResponseStreamEvent[] = [
      {
        item_id: 'ig_123',
        output_index: 0,
        sequence_number: 1,
        type: 'response.image_generation_call.in_progress',
      },
    ];
    const emitted: string[] = [];

    for await (const event of observeHostedImageGenerationStream(streamEvents(events))) {
      emitted.push(event.type);
    }

    expect(emitted).toEqual(['response.image_generation_call.in_progress']);
  });
});
