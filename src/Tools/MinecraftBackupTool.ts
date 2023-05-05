import { exec } from 'child_process';
import { injectable } from 'inversify';
import { Tool } from 'langchain/tools';

@injectable()
export class MinecraftBackupTool extends Tool {
  name = 'minecraft-backup';

  description =
    'Creates a backup of the minecraft server and updates the map. Gives back the output and the map URL. Input should be an empty string. This tool is slow, so please inform the user you are using it through the intermediate-anwser tool first.';

  protected _call(): Promise<string> {
    return new Promise<string>((resolve) => {
      exec(
        '/home/jannis/parmelae-bot/cmd/backupminecraft',
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
