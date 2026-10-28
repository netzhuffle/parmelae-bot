import { AsyncLocalStorage } from 'node:async_hooks';

import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { BaseMessage } from '@langchain/core/messages';
import { ChatGenerationChunk } from '@langchain/core/outputs';
import {
  ChatOpenAI,
  ChatOpenAIFields,
  ChatOpenAIResponses,
  convertResponsesDeltaToChatGenerationChunk,
  convertMessagesToResponsesInput,
} from '@langchain/openai';
import { OpenAI } from 'openai';

type HostedImageGenerationStartHandler = () => Promise<void> | void;

const hostedImageGenerationStartHandlerStorage =
  new AsyncLocalStorage<HostedImageGenerationStartHandler>();

function isHostedImageGenerationStartEvent(event: OpenAI.Responses.ResponseStreamEvent): boolean {
  return (
    event.type === 'response.image_generation_call.in_progress' ||
    event.type === 'response.image_generation_call.generating' ||
    (event.type === 'response.output_item.added' && event.item.type === 'image_generation_call')
  );
}

/**
 * Wraps an OpenAI Responses event stream and emits the scoped hosted image-generation
 * callback once, before yielding the triggering event to LangChain.
 */
export async function* observeHostedImageGenerationStream(
  stream: AsyncIterable<OpenAI.Responses.ResponseStreamEvent>,
): AsyncGenerator<OpenAI.Responses.ResponseStreamEvent> {
  let emittedHostedImageGenerationStart = false;
  for await (const event of stream) {
    if (!emittedHostedImageGenerationStart && isHostedImageGenerationStartEvent(event)) {
      emittedHostedImageGenerationStart = true;
      await notifyHostedImageGenerationStarted();
    }
    yield event;
  }
}

/**
 * Runs a model stream with a callback for hosted OpenAI image-generation start events.
 */
export async function withHostedImageGenerationStartHandler<Result>(
  handler: HostedImageGenerationStartHandler,
  task: () => Promise<Result>,
): Promise<Result> {
  return await hostedImageGenerationStartHandlerStorage.run(handler, task);
}

/** Emits the currently scoped hosted image-generation start callback, if one exists. */
export async function notifyHostedImageGenerationStarted(): Promise<void> {
  await hostedImageGenerationStartHandlerStorage.getStore()?.();
}

class ObservedChatOpenAIResponses extends ChatOpenAIResponses {
  override async *_streamResponseChunks(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun,
  ): AsyncGenerator<ChatGenerationChunk> {
    const streamIterable = await this.completionWithRetry(
      {
        ...this.invocationParams(options),
        input: convertMessagesToResponsesInput({
          messages,
          zdrEnabled: this.zdrEnabled ?? false,
          model: this.model,
        }),
        stream: true,
      },
      options,
    );

    for await (const data of observeHostedImageGenerationStream(streamIterable)) {
      if (options.signal?.aborted) {
        return;
      }
      const chunk = convertResponsesDeltaToChatGenerationChunk(data);
      if (chunk === null) {
        continue;
      }
      yield chunk;
      await runManager?.handleLLMNewToken(
        chunk.text || '',
        {
          prompt: options.promptIndex ?? 0,
          completion: 0,
        },
        undefined,
        undefined,
        undefined,
        { chunk },
      );
    }
  }
}

/**
 * Creates a ChatOpenAI instance that preserves normal LangChain streaming while exposing
 * raw hosted image-generation start events through AsyncLocalStorage.
 */
export function createObservedChatOpenAI(fields: ChatOpenAIFields): ChatOpenAI {
  return new ChatOpenAI({
    ...fields,
    responses: new ObservedChatOpenAIResponses(fields),
  });
}
