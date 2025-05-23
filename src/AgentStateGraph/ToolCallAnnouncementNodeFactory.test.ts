import { ToolCallAnnouncementNodeFactory } from './ToolCallAnnouncementNodeFactory.js';
import { INTERMEDIATE_ANSWER_TOOL_NAME } from '../Tools/IntermediateAnswerTool.js';
import { AIMessage } from '@langchain/core/messages';

describe('ToolCallAnnouncementNodeFactory', () => {
  let announceToolCall: jest.Mock;
  let factory: ToolCallAnnouncementNodeFactory;

  beforeEach(() => {
    announceToolCall = jest.fn(() => Promise.resolve(123)); // Mock returns message ID
    factory = new ToolCallAnnouncementNodeFactory();
  });

  it('announces a single tool call with JSON input', async () => {
    const node = factory.create(announceToolCall);
    const messages = [
      new AIMessage({
        content: '',
        tool_calls: [
          {
            name: 'TestTool',
            args: { foo: 1, bar: null, baz: false },
          },
        ],
      }),
    ];
    await node({ messages, toolExecution: {} });
    expect(announceToolCall).toHaveBeenCalledWith('[TestTool: {foo: 1}]');
  });

  it('announces a single tool call with plain string input', async () => {
    const node = factory.create(announceToolCall);
    const messages = [
      new AIMessage({
        content: '',
        tool_calls: [
          {
            name: 'TestTool',
            args: { value: 'plain text' },
          },
        ],
      }),
    ];
    await node({ messages, toolExecution: {} });
    expect(announceToolCall).toHaveBeenCalledWith(
      '[TestTool: {value: plain text}]',
    );
  });

  it('announces multiple tool calls except IntermediateAnswerTool', async () => {
    const node = factory.create(announceToolCall);
    const messages = [
      new AIMessage({
        content: '',
        tool_calls: [
          {
            name: 'TestTool',
            args: { foo: 2 },
          },
          {
            name: INTERMEDIATE_ANSWER_TOOL_NAME,
            args: { bar: 3 },
          },
          {
            name: 'AnotherTool',
            args: { value: 'baz' },
          },
        ],
      }),
    ];
    await node({ messages, toolExecution: {} });
    expect(announceToolCall).toHaveBeenCalledTimes(1);
    expect(announceToolCall).toHaveBeenCalledWith(
      '[TestTool: {foo: 2}]\n[AnotherTool: {value: baz}]',
    );
  });

  it('does not announce if only IntermediateAnswerTool is present', async () => {
    const node = factory.create(announceToolCall);
    const messages = [
      new AIMessage({
        content: '',
        tool_calls: [
          {
            name: INTERMEDIATE_ANSWER_TOOL_NAME,
            args: { bar: 3 },
          },
        ],
      }),
    ];
    await node({ messages, toolExecution: {} });
    expect(announceToolCall).not.toHaveBeenCalled();
  });

  it('announces a tool call with object args, single parameter', async () => {
    const node = factory.create(announceToolCall);
    const messages = [
      new AIMessage({
        content: '',
        tool_calls: [{ name: 'TestTool', args: { foo: 1 } }],
      }),
    ];
    await node({ messages, toolExecution: {} });
    expect(announceToolCall).toHaveBeenCalledWith('[TestTool: {foo: 1}]');
  });

  it('announces a tool call with object args, multiple parameters', async () => {
    const node = factory.create(announceToolCall);
    const messages = [
      new AIMessage({
        content: '',
        tool_calls: [{ name: 'TestTool', args: { foo: 1, bar: 2 } }],
      }),
    ];
    await node({ messages, toolExecution: {} });
    expect(announceToolCall).toHaveBeenCalledWith(
      '[TestTool: {foo: 1, bar: 2}]',
    );
  });

  it('announces a tool call with object args, null/false parameters are omitted', async () => {
    const node = factory.create(announceToolCall);
    const messages = [
      new AIMessage({
        content: '',
        tool_calls: [
          { name: 'TestTool', args: { foo: 1, bar: null, baz: false, qux: 2 } },
        ],
      }),
    ];
    await node({ messages, toolExecution: {} });
    expect(announceToolCall).toHaveBeenCalledWith(
      '[TestTool: {foo: 1, qux: 2}]',
    );
  });

  it('announces a tool call with object args, empty object', async () => {
    const node = factory.create(announceToolCall);
    const messages = [
      new AIMessage({
        content: '',
        tool_calls: [{ name: 'TestTool', args: {} }],
      }),
    ];
    await node({ messages, toolExecution: {} });
    expect(announceToolCall).toHaveBeenCalledWith('[TestTool]');
  });

  it('announces a tool call with no args property (should output just tool name)', () => {
    const node = factory.create(announceToolCall);
    const messages = [
      new AIMessage({
        content: '',
        tool_calls: [
          // @ts-expect-error: Simulate missing args property
          { name: 'TestTool' },
        ],
      }),
    ];
    return node({ messages, toolExecution: {} }).then(() => {
      expect(announceToolCall).toHaveBeenCalledWith('[TestTool]');
    });
  });

  it('announces multiple tool calls in a single message, separated by newlines', async () => {
    const node = factory.create(announceToolCall);
    const messages = [
      new AIMessage({
        content: '',
        tool_calls: [
          { name: 'TestTool', args: { foo: 2 } },
          { name: 'AnotherTool', args: { value: 'baz' } },
        ],
      }),
    ];
    await node({ messages, toolExecution: {} });
    expect(announceToolCall).toHaveBeenCalledTimes(1);
    expect(announceToolCall).toHaveBeenCalledWith(
      '[TestTool: {foo: 2}]\n[AnotherTool: {value: baz}]',
    );
  });

  it('includes AIMessage content as the first line if present', async () => {
    const node = factory.create(announceToolCall);
    const messages = [
      new AIMessage({
        content: 'This is the message content.',
        tool_calls: [{ name: 'TestTool', args: { foo: 1 } }],
      }),
    ];
    await node({ messages, toolExecution: {} });
    expect(announceToolCall).toHaveBeenCalledWith(
      'This is the message content.\n[TestTool: {foo: 1}]',
    );
  });

  it('includes AIMessage content as the only line if there are no tool calls', async () => {
    const node = factory.create(announceToolCall);
    const messages = [
      new AIMessage({
        content: 'Only content, no tool calls.',
        tool_calls: [],
      }),
    ];
    await node({ messages, toolExecution: {} });
    expect(announceToolCall).toHaveBeenCalledWith(
      'Only content, no tool calls.',
    );
  });

  it('does not announce if there is no content and no tool calls', async () => {
    const node = factory.create(announceToolCall);
    const messages = [
      new AIMessage({
        content: '',
        tool_calls: [],
      }),
    ];
    await node({ messages, toolExecution: {} });
    expect(announceToolCall).not.toHaveBeenCalled();
  });

  it('formats non-string parameter values correctly', async () => {
    const node = factory.create(announceToolCall);
    const messages = [
      new AIMessage({
        content: '',
        tool_calls: [
          {
            name: 'TestTool',
            args: {
              num: 42,
              bool: true,
              arr: [1, 2],
              obj: { a: 1 },
            },
          },
        ],
      }),
    ];
    await node({ messages, toolExecution: {} });
    expect(announceToolCall).toHaveBeenCalledWith(
      '[TestTool: {num: 42, bool: true, arr: 1,2, obj: [object Object]}]',
    );
  });

  it('preserves parameter key order', async () => {
    const node = factory.create(announceToolCall);
    const messages = [
      new AIMessage({
        content: '',
        tool_calls: [{ name: 'TestTool', args: { a: 1, b: 2, c: 3 } }],
      }),
    ];
    await node({ messages, toolExecution: {} });
    expect(announceToolCall).toHaveBeenCalledWith(
      '[TestTool: {a: 1, b: 2, c: 3}]',
    );
  });

  it('stores tool execution context when tool calls exist and announcement succeeds', async () => {
    const node = factory.create(announceToolCall);
    const toolCalls = [
      {
        id: 'call-123',
        name: 'TestTool',
        args: { foo: 1 },
      },
    ];
    const aiMessage = new AIMessage({
      content: 'Test content',
      tool_calls: toolCalls,
    });
    const messages = [aiMessage];

    const result = await node({ messages, toolExecution: {} });

    expect(announceToolCall).toHaveBeenCalledWith(
      'Test content\n[TestTool: {foo: 1}]',
    );
    expect(result).toEqual({
      toolExecution: {
        announcementMessageId: 123,
        originalAIMessage: aiMessage,
        currentToolCallIds: ['call-123'],
      },
    });
  });

  it('does not store tool execution context when only content exists', async () => {
    const node = factory.create(announceToolCall);
    const messages = [
      new AIMessage({
        content: 'Only content, no tool calls.',
        tool_calls: [],
      }),
    ];

    const result = await node({ messages, toolExecution: {} });

    expect(announceToolCall).toHaveBeenCalledWith(
      'Only content, no tool calls.',
    );
    expect(result).toEqual({});
  });

  it('does not store tool execution context when no announcement is made', async () => {
    const node = factory.create(announceToolCall);
    const messages = [
      new AIMessage({
        content: '',
        tool_calls: [
          {
            name: INTERMEDIATE_ANSWER_TOOL_NAME,
            args: { bar: 3 },
          },
        ],
      }),
    ];

    const result = await node({ messages, toolExecution: {} });

    expect(announceToolCall).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it('does not store tool execution context when callback returns null', async () => {
    const announceToolCallReturningNull = jest.fn(() => Promise.resolve(null));
    const node = factory.create(announceToolCallReturningNull);
    const toolCalls = [
      {
        id: 'call-123',
        name: 'TestTool',
        args: { foo: 1 },
      },
    ];
    const messages = [
      new AIMessage({
        content: 'Test content',
        tool_calls: toolCalls,
      }),
    ];

    const result = await node({ messages, toolExecution: {} });

    expect(announceToolCallReturningNull).toHaveBeenCalledWith(
      'Test content\n[TestTool: {foo: 1}]',
    );
    expect(result).toEqual({});
  });

  it('filters out tool calls without ids when storing context', async () => {
    const node = factory.create(announceToolCall);
    const toolCalls = [
      {
        id: 'call-123',
        name: 'TestTool',
        args: { foo: 1 },
      },
      {
        // Missing id
        name: 'AnotherTool',
        args: { bar: 2 },
      },
    ];
    const aiMessage = new AIMessage({
      content: 'Test content',
      tool_calls: toolCalls,
    });
    const messages = [aiMessage];

    const result = await node({ messages, toolExecution: {} });

    expect(result).toEqual({
      toolExecution: {
        announcementMessageId: 123,
        originalAIMessage: aiMessage,
        currentToolCallIds: ['call-123'], // Only the one with id
      },
    });
  });
});
