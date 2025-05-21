import { ToolCallAnnouncementNodeFactory } from './ToolCallAnnouncementNodeFactory.js';
import { INTERMEDIATE_ANSWER_TOOL_NAME } from '../Tools/IntermediateAnswerTool.js';
import { AIMessage } from '@langchain/core/messages';

describe('ToolCallAnnouncementNodeFactory', () => {
  let announceToolCall: jest.Mock;
  let factory: ToolCallAnnouncementNodeFactory;

  beforeEach(() => {
    announceToolCall = jest.fn(() => Promise.resolve());
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
    await node({ messages });
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
    await node({ messages });
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
    await node({ messages });
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
    await node({ messages });
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
    await node({ messages });
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
    await node({ messages });
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
    await node({ messages });
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
    await node({ messages });
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
    return node({ messages }).then(() => {
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
    await node({ messages });
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
    await node({ messages });
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
    await node({ messages });
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
    await node({ messages });
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
    await node({ messages });
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
    await node({ messages });
    expect(announceToolCall).toHaveBeenCalledWith(
      '[TestTool: {a: 1, b: 2, c: 3}]',
    );
  });
});
