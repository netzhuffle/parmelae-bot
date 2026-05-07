import { tool } from '@langchain/core/tools';
import * as z from 'zod';

import { runMinecraftServerCommand } from './minecraftServerCommand.js';

/**
 * Tool for starting the Minecraft server.
 *
 * **Security Note:** No user input accepted to prevent shell injection.
 * Only executes a fixed server start command.
 */
export const minecraftStartTool = tool(
  async (): Promise<string> => {
    return runMinecraftServerCommand('start');
  },
  {
    name: 'minecraft-start',
    description: 'Starts the minecraft server and returns the console output.',
    schema: z.strictObject({}),
  },
);
