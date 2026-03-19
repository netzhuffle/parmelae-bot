import { tool } from '@langchain/core/tools';
import { $ } from 'bun';
import * as z from 'zod';

import { getCommandPath } from '../RuntimePaths.js';

/**
 * Tool for checking Minecraft server status.
 *
 * **Security Note:** No user input accepted to prevent shell injection.
 * Only executes a fixed server status check command.
 */
export const minecraftStatusTool = tool(
  async (): Promise<string> => {
    try {
      const result = await $`${getCommandPath('statusminecraft')}`.text();
      return result.trim();
    } catch (error) {
      const stderr = (error as { stderr?: string })?.stderr?.trim() ?? 'Unknown error';
      return `Error: ${stderr}`;
    }
  },
  {
    name: 'minecraft-status',
    description: 'Checks if the minecraft server is running and returns the status.',
    schema: z.strictObject({}),
  },
);
