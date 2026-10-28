import { describe, expect, it, mock } from 'bun:test';

import { AIMessage, AIMessageChunk, ToolMessage } from '@langchain/core/messages';

import { getAiMessageTextContent, getLastAiMessageTextContent } from './AiMessageTextContent.js';
import { ChatGptAgentService } from './ChatGptAgentService.js';
import { Conversation } from './Conversation.js';
import { notifyHostedImageGenerationStarted } from './HostedImageGenerationObserver.js';
import { ChatGptRoles } from './MessageGenerators/ChatGptMessage.js';
import type { Identity } from './MessageGenerators/Identities/Identity.js';
import { FinalizableStreamingTextSink, StreamingTextSink } from './StreamingTextSink.js';
import { TelegramDeliveryError } from './TelegramService.js';
import { imageGenerationTool } from './Tools/imageGenerationTool.js';

describe('getAiMessageTextContent', () => {
  it('returns string content unchanged', () => {
    expect(getAiMessageTextContent(new AIMessage('Hello'))).toBe('Hello');
  });

  it('extracts text from Responses-style content blocks', () => {
    const message = new AIMessage({
      content: [{ type: 'text', text: 'Hello from responses' }],
    });

    expect(getAiMessageTextContent(message)).toBe('Hello from responses');
  });
});

describe('getLastAiMessageTextContent', () => {
  it('extracts text from serialized ai messages in LangGraph state', () => {
    expect(
      getLastAiMessageTextContent([
        { type: 'human', content: 'Question' },
        { type: 'ai', content: [{ type: 'text', text: 'Streamed answer' }] },
      ]),
    ).toBe('Streamed answer');
  });

  it('finds the last assistant message even when state ends with a non-ai message', () => {
    expect(
      getLastAiMessageTextContent([
        new AIMessage('Earlier answer'),
        { type: 'tool', content: 'tool output' },
      ]),
    ).toBe('Earlier answer');
  });
});

type FakeAgentStreamEvent = ['messages' | 'values', unknown];

const imageTestIdentity: Identity = {
  name: 'Test',
  systemPrompt: 'Test system prompt',
  conversationLength: 1,
  tools: [imageGenerationTool],
};

const imageTestMessage = {
  chatId: BigInt(123),
  fromId: BigInt(456),
  text: 'Mach das bitte.',
};

function createFakeImageOutput(): AIMessage {
  return new AIMessage({
    content: [],
    additional_kwargs: {
      tool_outputs: [
        {
          type: 'image_generation_call',
          result: 'aGVsbG8=',
          revised_prompt: 'Generated image',
        },
      ],
    },
  });
}

function createImageTestService(
  events: string[],
  stream: () => AsyncGenerator<FakeAgentStreamEvent>,
): ChatGptAgentService {
  const fakeAgent = { stream };
  const service = Object.create(ChatGptAgentService.prototype) as ChatGptAgentService;
  Object.assign(service as object, {
    agentStateGraphFactory: {
      create: () => fakeAgent,
    },
    callbackHandler: {},
    config: {
      gptModel: 'cheap',
      identityByChatId: new Map(),
    },
    emulatorIdentity: {},
    identityResolver: {},
    intermediateAnswerToolFactory: {
      create: () => ({ name: 'intermediate-answer' }),
    },
    models: {
      getModel: () => ({}),
    },
    pokemonTcgPocketService: {},
    scheduleMessageToolFactory: {
      create: () => ({ name: 'schedule-message' }),
    },
    schiParmelaeIdentity: {},
    telegramService: {
      replyWithImage: async () => {
        events.push('image');
      },
      startUploadPhotoStatus: () => {
        events.push('upload-photo');
        return () => {
          events.push('stop-upload-photo');
        };
      },
    },
    tools: [],
  });
  return service;
}

function createRecordingStreamSink(
  events: string[],
  options: { includeFinalTextInEvent?: boolean } = {},
): {
  finalTexts: string[];
  streamSink: FinalizableStreamingTextSink;
} {
  const finalTexts: string[] = [];
  return {
    finalTexts,
    streamSink: {
      appendText: async () => {
        events.push('draft');
      },
      reset: async () => {
        return;
      },
      sendFinalText: async (text) => {
        finalTexts.push(text);
        events.push(options.includeFinalTextInEvent === true ? `final-text:${text}` : 'final-text');
        return 777 + finalTexts.length - 1;
      },
    },
  };
}

function generateImageTestReply(
  service: ChatGptAgentService,
  streamSink: FinalizableStreamingTextSink,
) {
  return service.generate(
    imageTestMessage as never,
    new Conversation([]),
    async () => null,
    imageTestIdentity,
    streamSink,
  );
}

describe('ChatGptAgentService.generate', () => {
  it('retries when getReply rejects asynchronously', async () => {
    const service = Object.create(ChatGptAgentService.prototype) as ChatGptAgentService;
    const getReply = mock()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValue({
        message: {
          role: ChatGptRoles.Assistant,
          content: 'Recovered response',
        },
        toolCallMessageIds: [123],
      });
    Object.assign(service as object, { getReply });

    const identity: Identity = {
      name: 'Test',
      systemPrompt: 'Test system prompt',
      conversationLength: 1,
      tools: [],
    };
    const resetMock = mock(async () => {
      return;
    });
    const streamSink: StreamingTextSink = {
      appendText: async () => {
        return;
      },
      reset: resetMock,
    };

    const result = await service.generate(
      undefined as never,
      new Conversation([]),
      async () => null,
      identity,
      streamSink,
    );

    expect(getReply).toHaveBeenCalledTimes(2);
    expect(resetMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      message: {
        role: ChatGptRoles.Assistant,
        content: 'Recovered response',
      },
      toolCallMessageIds: [123],
    });
  });

  it('finalizes streamed image lead-in text before waiting for hosted image output', async () => {
    const events: string[] = [];
    const service = createImageTestService(events, async function* () {
      yield [
        'messages',
        [
          new AIMessageChunk(
            'Ich passe es jetzt an: Die beiden Schwänze werden wieder natürlich umschlungen.',
          ),
          {},
        ],
      ];
      await notifyHostedImageGenerationStarted();
      yield [
        'values',
        {
          messages: [createFakeImageOutput()],
          toolCallMessageIds: [321],
        },
      ];
    });
    const { streamSink } = createRecordingStreamSink(events);

    const resultPromise = generateImageTestReply(service, streamSink);
    await Promise.resolve();
    await Promise.resolve();
    const result = await resultPromise;

    expect(events).toEqual(['draft', 'final-text', 'upload-photo', 'image', 'stop-upload-photo']);
    expect(result.finalMessageId).toBe(777);
    expect(result.finalMessageIds).toEqual([777]);
    expect(result.message.content).toBe(
      'Ich passe es jetzt an: Die beiden Schwänze werden wieder natürlich umschlungen.',
    );
    expect(result.toolCallMessageIds).toEqual([321]);
  });

  it('sends post-image assistant text as a separate message after the generated image', async () => {
    const events: string[] = [];
    const service = createImageTestService(events, async function* () {
      yield ['messages', [new AIMessageChunk('Ich passe es jetzt an.'), {}]];
      await notifyHostedImageGenerationStarted();
      yield ['messages', [new AIMessageChunk('So ist es wieder schön verwoben.'), {}]];
      yield [
        'values',
        {
          messages: [createFakeImageOutput()],
          toolCallMessageIds: [321],
        },
      ];
    });
    const { streamSink } = createRecordingStreamSink(events, { includeFinalTextInEvent: true });

    const result = await generateImageTestReply(service, streamSink);

    expect(events).toEqual([
      'draft',
      'final-text:Ich passe es jetzt an.',
      'upload-photo',
      'image',
      'stop-upload-photo',
      'final-text:So ist es wieder schön verwoben.',
    ]);
    expect(result.finalMessageId).toBe(778);
    expect(result.finalMessageIds).toEqual([777, 778]);
    expect(result.message.content).toBe(
      'Ich passe es jetzt an.\n\nSo ist es wieder schön verwoben.',
    );
  });

  it('does not stream tool responses as assistant text', async () => {
    const events: string[] = [];
    const service = createImageTestService(events, async function* () {
      yield [
        'messages',
        [
          new ToolMessage({
            content: 'Successfully sent the text to the telegram chat',
            tool_call_id: 'call-123',
          }),
          {},
        ],
      ];
      await notifyHostedImageGenerationStarted();
      yield [
        'values',
        {
          messages: [createFakeImageOutput()],
          toolCallMessageIds: [321],
        },
      ];
    });
    const { finalTexts, streamSink } = createRecordingStreamSink(events);

    const result = await generateImageTestReply(service, streamSink);

    expect(finalTexts).toEqual([]);
    expect(events).toEqual(['upload-photo', 'image', 'stop-upload-photo']);
    expect(result.message.content).toBe('Ich habe das Bild gesendet.');
  });

  it('does not rerun the agent after Telegram image delivery fails', async () => {
    const service = Object.create(ChatGptAgentService.prototype) as ChatGptAgentService;
    const deliveryError = new TelegramDeliveryError(
      'Could not send generated image',
      new Error('connection reset'),
    );
    const getReply = mock().mockRejectedValue(deliveryError);
    Object.assign(service as object, { getReply });

    const result = await service.generate(
      undefined as never,
      new Conversation([]),
      async () => null,
      imageTestIdentity,
    );

    expect(getReply).toHaveBeenCalledTimes(1);
    expect(result.message.content).toBe('Fehler: Could not send generated image');
  });
});
