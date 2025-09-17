import { describe, beforeEach, it, expect } from 'bun:test';
import { identityQueryTool } from './identityQueryTool.js';
import { SchiParmelaeIdentity } from '../MessageGenerators/Identities/SchiParmelaeIdentity.js';
import { EmulatorIdentity } from '../MessageGenerators/Identities/EmulatorIdentity.js';
import { createTestToolConfig, ToolContext } from '../ChatGptAgentService.js';
import { Identity } from '../MessageGenerators/Identities/Identity.js';

const TEST_CHAT_ID_1 = '123456789';
const TEST_CHAT_ID_2 = '987654321';

describe('identityQueryTool', () => {
  let identityByChatId: Map<bigint, Identity>;
  let schiParmelaeIdentity: SchiParmelaeIdentity;
  let emulatorIdentity: EmulatorIdentity;
  let config: { configurable: ToolContext };

  beforeEach(() => {
    identityByChatId = new Map<bigint, Identity>();
    schiParmelaeIdentity = new SchiParmelaeIdentity();
    emulatorIdentity = new EmulatorIdentity();

    config = createTestToolConfig({
      chatId: BigInt(TEST_CHAT_ID_1),
      identityByChatId,
      identities: {
        schiParmelae: schiParmelaeIdentity,
        emulator: emulatorIdentity,
      },
    });
  });

  it('should return default identity when no identity is set for chat', async () => {
    const result = await identityQueryTool.invoke({}, config);
    expect(result).toBe('Schi Parmelä');
  });

  it('should return set identity for specific chat', async () => {
    identityByChatId.set(BigInt(TEST_CHAT_ID_1), emulatorIdentity);

    const result = await identityQueryTool.invoke({}, config);
    expect(result).toBe('Emulator');
  });

  it('should return correct identity for different chat IDs', async () => {
    // Set different identities for different chats
    identityByChatId.set(BigInt(TEST_CHAT_ID_1), emulatorIdentity);
    identityByChatId.set(BigInt(TEST_CHAT_ID_2), schiParmelaeIdentity);

    // Test first chat
    const result1 = await identityQueryTool.invoke({}, config);
    expect(result1).toBe('Emulator');

    // Test second chat
    const config2 = createTestToolConfig({
      chatId: BigInt(TEST_CHAT_ID_2),
      identityByChatId,
      identities: {
        schiParmelae: schiParmelaeIdentity,
        emulator: emulatorIdentity,
      },
    });
    const result2 = await identityQueryTool.invoke({}, config2);
    expect(result2).toBe('Schi Parmelä');
  });

  it('should return default identity for chat without explicit identity setting', async () => {
    // Set identity for different chat
    identityByChatId.set(BigInt(TEST_CHAT_ID_2), emulatorIdentity);

    // Test current chat should still return default
    const result = await identityQueryTool.invoke({}, config);
    expect(result).toBe('Schi Parmelä');
  });

  it('should handle empty identityByChatId map correctly', async () => {
    // Ensure map is empty
    identityByChatId.clear();

    const result = await identityQueryTool.invoke({}, config);
    expect(result).toBe('Schi Parmelä');
  });
});
