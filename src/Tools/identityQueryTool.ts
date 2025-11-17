import { tool } from '@langchain/core/tools';
import * as z from 'zod';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { getToolContext } from '../ChatGptAgentService.js';

/**
 * Tool to query which bot identity is currently used for a chat.
 */
export const identityQueryTool = tool(
  (_input: Record<string, never>, config: LangGraphRunnableConfig): string => {
    const context = getToolContext(config);
    const chatId = context.chatId;

    const identity =
      context.identityByChatId.get(chatId)?.name ??
      context.identities.schiParmelae.name;

    return identity;
  },
  {
    name: 'identity-query',
    description:
      'Use to find out which bot identity is used for the prompt. Returns the name of the used identity, by example Schi Parmelä or Emulator. Input should be an empty string.',
    schema: z.object({}),
  },
);
