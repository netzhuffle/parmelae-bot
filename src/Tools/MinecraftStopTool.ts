import { exec } from 'child_process';
import { injectable } from 'inversify';
import { Tool } from '@langchain/core/tools';

@injectable()
export class MinecraftStopTool extends Tool {
  name = 'minecraft-stop';

  description =
    'Stops the minecraft server. Gives back the console output. Input should be an empty string.';

  protected _call(): Promise<string> {
    return new Promise<string>((resolve) => {
      exec(
        '/home/jannis/parmelae-bot/cmd/stopminecraft',
        (error, stdout, stderr) => {
          if (error) {
            resolve('Error: ' + stderr.trim());
          } else {
            resolve(stdout.trim());
          }
        },
      );
    });
  }
}
