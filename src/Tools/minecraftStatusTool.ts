import { tool } from '@langchain/core/tools';
import * as z from 'zod';

import { runMinecraftServerCommand } from './minecraftServerCommand.js';

/**
 * Tool for checking Minecraft server status.
 *
 * **Security Note:** No user input accepted to prevent shell injection.
 * Only executes a fixed server status check command.
 */
export const minecraftStatusTool = tool(
  async (): Promise<string> => {
    return runMinecraftServerCommand('status');
  },
  {
    name: 'minecraft-status',
    description: 'Checks if the minecraft server is running and returns the status.',
    schema: z.strictObject({}),
  },
);
