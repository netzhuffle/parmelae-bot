import { beforeEach, describe, expect, it } from 'bun:test';

import { TelegramServiceFake } from '../Fakes/TelegramServiceFake.js';
import { IntermediateAnswerTool } from './IntermediateAnswerTool.js';

describe('IntermediateAnswerTool', () => {
  let telegram: TelegramServiceFake;
  let tool: IntermediateAnswerTool;

  beforeEach(() => {
    telegram = new TelegramServiceFake();
    tool = new IntermediateAnswerTool(telegram, BigInt(123));
  });

  it('sends intermediate answers through the markdown-aware bot text path', async () => {
    const result = await tool.invoke('`Zwischenstand`');

    expect(result).toBe('Successfully sent the text to the telegram chat');
    expect(telegram.sendBotTextCallArgs).toEqual([
      {
        text: '`Zwischenstand`',
        chatId: BigInt(123),
      },
    ]);
  });

  it('returns an error when Telegram send fails', async () => {
    telegram.sendShouldThrow = true;
    telegram.sendError = new Error('send failed');

    const result = await tool.invoke('Status');

    expect(result).toBe('Error: Could not send text to telegram');
  });
});
