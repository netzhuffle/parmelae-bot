import {exec} from "child_process";
import {Tool} from "langchain/agents";

export class MinecraftStopTool extends Tool {
    name = 'minecraft-stop';

    description = 'Stops the minecraft server, creates a backup, and updates the map. Gives back the output and the map URL. Input should be an empty string.';

    protected _call(arg: string): Promise<string> {
        return new Promise<string>((resolve) => {
            exec('/home/jannis/parmelae-bot/cmd/stopminecraft', (error, stdout, stderr) => {
                if (error) {
                    resolve('Error: ' + stderr.trim());
                } else {
                    resolve(stdout.trim());
                }
            });
        });
    }
}