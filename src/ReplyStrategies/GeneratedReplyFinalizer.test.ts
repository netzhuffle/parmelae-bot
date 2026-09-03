import { describe, expect, it, mock } from 'bun:test';

import { getFinalReplyMessageId } from './GeneratedReplyFinalizer.js';

describe('getFinalReplyMessageId', () => {
  it('uses the last already sent final message id', async () => {
    const sendFinalText = mock(async () => 999);

    const result = await getFinalReplyMessageId(
      {
        text: 'final text',
        toolCallMessageIds: [],
        finalMessageIds: [123, 456],
      },
      sendFinalText,
    );

    expect(result).toBe(456);
    expect(sendFinalText).not.toHaveBeenCalled();
  });

  it('falls back to the legacy single final message id', async () => {
    const sendFinalText = mock(async () => 999);

    const result = await getFinalReplyMessageId(
      {
        text: 'final text',
        toolCallMessageIds: [],
        finalMessageId: 123,
      },
      sendFinalText,
    );

    expect(result).toBe(123);
    expect(sendFinalText).not.toHaveBeenCalled();
  });

  it('sends the final text when no final message was already sent', async () => {
    const sendFinalText = mock(async () => 999);

    const result = await getFinalReplyMessageId(
      {
        text: 'final text',
        toolCallMessageIds: [],
      },
      sendFinalText,
    );

    expect(result).toBe(999);
    expect(sendFinalText).toHaveBeenCalledWith('final text');
  });
});
