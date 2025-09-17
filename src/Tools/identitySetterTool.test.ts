import { describe, beforeEach, it, expect } from 'bun:test';
import { identitySetterTool } from './identitySetterTool.js';
import { SchiParmelaeIdentity } from '../MessageGenerators/Identities/SchiParmelaeIdentity.js';
import { EmulatorIdentity } from '../MessageGenerators/Identities/EmulatorIdentity.js';
import { createTestToolConfig, ToolContext } from '../ChatGptAgentService.js';
import { Identity } from '../MessageGenerators/Identities/Identity.js';

const TEST_CHAT_ID_1 = '123456789';
const TEST_CHAT_ID_2 = '987654321';

describe('identitySetterTool', () => {
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

  describe('setting valid identities', () => {
    it('should set Schi Parmelä identity successfully', async () => {
      const result = await identitySetterTool.invoke(
        { identity: 'Schi Parmelä' },
        config,
      );

      expect(result).toBe('Success: Schi Parmelä will be used from now on.');
      expect(identityByChatId.get(BigInt(TEST_CHAT_ID_1))).toBe(
        schiParmelaeIdentity,
      );
    });

    it('should set Emulator identity successfully', async () => {
      const result = await identitySetterTool.invoke(
        { identity: 'Emulator' },
        config,
      );

      expect(result).toBe('Success: Emulator will be used from now on.');
      expect(identityByChatId.get(BigInt(TEST_CHAT_ID_1))).toBe(
        emulatorIdentity,
      );
    });

    it('should trim whitespace from identity name', async () => {
      const result = await identitySetterTool.invoke(
        { identity: '  Emulator  ' },
        config,
      );

      expect(result).toBe('Success: Emulator will be used from now on.');
      expect(identityByChatId.get(BigInt(TEST_CHAT_ID_1))).toBe(
        emulatorIdentity,
      );
    });
  });

  describe('setting invalid identities', () => {
    it('should return error message for unknown identity', async () => {
      const result = await identitySetterTool.invoke(
        { identity: 'Unknown Identity' },
        config,
      );

      expect(result).toBe(
        'Error: Unknown identity. Use "Schi Parmelä" or "Emulator".',
      );
      expect(identityByChatId.has(BigInt(TEST_CHAT_ID_1))).toBe(false);
    });

    it('should return error message for empty identity', async () => {
      const result = await identitySetterTool.invoke({ identity: '' }, config);

      expect(result).toBe(
        'Error: Unknown identity. Use "Schi Parmelä" or "Emulator".',
      );
      expect(identityByChatId.has(BigInt(TEST_CHAT_ID_1))).toBe(false);
    });

    it('should return error message for whitespace-only identity', async () => {
      const result = await identitySetterTool.invoke(
        { identity: '   ' },
        config,
      );

      expect(result).toBe(
        'Error: Unknown identity. Use "Schi Parmelä" or "Emulator".',
      );
      expect(identityByChatId.has(BigInt(TEST_CHAT_ID_1))).toBe(false);
    });

    it('should return error message for case-sensitive mismatch', async () => {
      const result = await identitySetterTool.invoke(
        { identity: 'schi parmelä' },
        config,
      );

      expect(result).toBe(
        'Error: Unknown identity. Use "Schi Parmelä" or "Emulator".',
      );
      expect(identityByChatId.has(BigInt(TEST_CHAT_ID_1))).toBe(false);
    });
  });

  describe('chat-specific behavior', () => {
    it('should set identity only for specific chat ID', async () => {
      // Set identity for first chat
      await identitySetterTool.invoke({ identity: 'Emulator' }, config);

      // Create config for second chat
      const config2 = createTestToolConfig({
        chatId: BigInt(TEST_CHAT_ID_2),
        identityByChatId,
        identities: {
          schiParmelae: schiParmelaeIdentity,
          emulator: emulatorIdentity,
        },
      });

      // Verify first chat has the identity set
      expect(identityByChatId.get(BigInt(TEST_CHAT_ID_1))).toBe(
        emulatorIdentity,
      );

      // Verify second chat doesn't have identity set
      expect(identityByChatId.has(BigInt(TEST_CHAT_ID_2))).toBe(false);

      // Set different identity for second chat
      await identitySetterTool.invoke({ identity: 'Schi Parmelä' }, config2);

      // Verify both chats have correct identities
      expect(identityByChatId.get(BigInt(TEST_CHAT_ID_1))).toBe(
        emulatorIdentity,
      );
      expect(identityByChatId.get(BigInt(TEST_CHAT_ID_2))).toBe(
        schiParmelaeIdentity,
      );
    });

    it('should overwrite previous identity for same chat', async () => {
      // Set initial identity
      await identitySetterTool.invoke({ identity: 'Schi Parmelä' }, config);
      expect(identityByChatId.get(BigInt(TEST_CHAT_ID_1))).toBe(
        schiParmelaeIdentity,
      );

      // Change to different identity
      const result = await identitySetterTool.invoke(
        { identity: 'Emulator' },
        config,
      );

      expect(result).toBe('Success: Emulator will be used from now on.');
      expect(identityByChatId.get(BigInt(TEST_CHAT_ID_1))).toBe(
        emulatorIdentity,
      );
    });
  });
});
