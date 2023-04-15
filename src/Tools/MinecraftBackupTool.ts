import { exec } from 'child_process';
import { Tool } from 'langchain/agents';
import { injectable } from 'inversify';

@injectable()
export class MinecraftBackupTool extends Tool {
  name = 'minecraft-backup';

  description =
    'Creates a backup of the minecraft server and updates the map. Gives back the output and the map URL. Input should be an empty string.';

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
