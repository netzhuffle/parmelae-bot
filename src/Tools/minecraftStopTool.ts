import { tool } from '@langchain/core/tools';
import { $ } from 'bun';
import * as z from 'zod';

import { getCommandPath } from '../RuntimePaths.js';

/**
 * Tool for stopping the Minecraft server.
 *
 * **Security Note:** No user input accepted to prevent shell injection.
 * Only executes a fixed server stop command.
 */
export const minecraftStopTool = tool(
  async (): Promise<string> => {
    try {
      const result = await $`${getCommandPath('stopminecraft')}`.text();
      return result.trim();
    } catch (error) {
      const stderr = (error as { stderr?: string })?.stderr?.trim() ?? 'Unknown error';
      return `Error: ${stderr}`;
    }
  },
  {
    name: 'minecraft-stop',
    description: 'Stops the minecraft server and returns the console output.',
    schema: z.strictObject({}),
  },
);
