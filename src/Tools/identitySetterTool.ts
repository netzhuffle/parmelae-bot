import assert from 'node:assert/strict';
import { tool } from '@langchain/core/tools';
import * as z from 'zod';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { getToolContext } from '../ChatGptAgentService.js';

const schema = z.object({
  identity: z
    .string()
    .describe('Identity name to set: "Schi Parmelä" or "Emulator"'),
});

type IdentitySetterInput = z.infer<typeof schema>;

/**
 * Tool to set which bot identity should be used for a chat.
 */
export const identitySetterTool = tool(
  (
    { identity }: IdentitySetterInput,
    config: LangGraphRunnableConfig,
  ): string => {
    const context = getToolContext(config);
    const chatId = context.chatId;
    const identityName = identity.trim();

    try {
      const resolvedIdentity = context.identityResolver.resolve(identityName);
      context.identityByChatId.set(chatId, resolvedIdentity);
      return `Success: ${resolvedIdentity.name} will be used from now on.`;
    } catch (error) {
      assert(error instanceof Error);
      return `Error: ${error.message}`;
    }
  },
  {
    name: 'identity-set',
    description:
      'Use set which GPT language model should be used. Input should be "Schi Parmelä" or "Emulator".',
    schema,
  },
);
