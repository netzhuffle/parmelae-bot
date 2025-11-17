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

    switch (identityName) {
      case context.identities.schiParmelae.name:
        context.identityByChatId.set(chatId, context.identities.schiParmelae);
        break;
      case context.identities.emulator.name:
        context.identityByChatId.set(chatId, context.identities.emulator);
        break;
      default:
        return `Error: Unknown identity. Use "${context.identities.schiParmelae.name}" or "${context.identities.emulator.name}".`;
    }

    return `Success: ${identityName} will be used from now on.`;
  },
  {
    name: 'identity-set',
    description:
      'Use set which GPT language model should be used. Input should be "Schi Parmelä" or "Emulator".',
    schema,
  },
);
