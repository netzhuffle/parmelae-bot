import { $ } from 'bun';
import { injectable } from 'inversify';
import { Tool } from '@langchain/core/tools';

@injectable()
export class MinecraftStopTool extends Tool {
  name = 'minecraft-stop';

  description =
    'Stops the minecraft server. Gives back the console output. Input should be an empty string.';

  protected async _call(): Promise<string> {
    try {
      const result =
        await $`/home/jannis/parmelae-bot/cmd/stopminecraft`.text();
      return result.trim();
    } catch (error) {
      const stderr =
        (error as { stderr?: string })?.stderr?.trim() ?? 'Unknown error';
      return `Error: ${stderr}`;
    }
  }
}
