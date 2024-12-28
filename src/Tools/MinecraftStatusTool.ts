import { exec } from 'child_process';
import { injectable } from 'inversify';
import { Tool } from '@langchain/core/tools';

@injectable()
export class MinecraftStatusTool extends Tool {
  name = 'minecraft-status';

  description =
    'Checks if the minecraft server is running. Gives back the status. Input should be an empty string.';

  protected _call(): Promise<string> {
    return new Promise<string>((resolve) => {
      exec(
        '/home/jannis/parmelae-bot/cmd/statusminecraft',
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
