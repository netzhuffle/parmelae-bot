import { $ } from 'bun';
import { injectable } from 'inversify';
import { Tool } from '@langchain/core/tools';

@injectable()
export class MinecraftStatusTool extends Tool {
  name = 'minecraft-status';

  description =
    'Checks if the minecraft server is running. Gives back the status. Input should be an empty string.';

  protected async _call(): Promise<string> {
    try {
      const result =
        await $`/home/jannis/parmelae-bot/cmd/statusminecraft`.text();
      return result.trim();
    } catch (error) {
      const stderr =
        (error as { stderr?: string })?.stderr?.trim() ?? 'Unknown error';
      return `Error: ${stderr}`;
    }
  }
}
