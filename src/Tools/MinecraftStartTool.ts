import { $ } from 'bun';
import { injectable } from 'inversify';
import { Tool } from '@langchain/core/tools';

@injectable()
export class MinecraftStartTool extends Tool {
  name = 'minecraft-start';

  description =
    'Starts the minecraft server. Gives back the console output. Input should be an empty string.';

  protected async _call(): Promise<string> {
    try {
      const result =
        await $`/home/jannis/parmelae-bot/cmd/startminecraft`.text();
      return result.trim();
    } catch (error) {
      const stderr =
        (error as { stderr?: string })?.stderr?.trim() ?? 'Unknown error';
      return `Error: ${stderr}`;
    }
  }
}
