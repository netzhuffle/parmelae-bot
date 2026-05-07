import { tool } from '@langchain/core/tools';
import * as z from 'zod';

import { runMinecraftServerCommand } from './minecraftServerCommand.js';

/**
 * Tool for stopping the Minecraft server.
 *
 * **Security Note:** No user input accepted to prevent shell injection.
 * Only executes a fixed server stop command.
 */
export const minecraftStopTool = tool(
  async (): Promise<string> => {
    return runMinecraftServerCommand('stop');
  },
  {
    name: 'minecraft-stop',
    description: 'Stops the minecraft server and returns the console output.',
    schema: z.strictObject({}),
  },
);
