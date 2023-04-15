import {exec} from "child_process";
import {Tool} from "langchain/agents";
import {injectable} from "inversify";

@injectable()
export class MinecraftStatusTool extends Tool {
    name = 'minecraft-status';

    description = 'Checks if the minecraft server is running. Gives back the status. Input should be an empty string.';

    protected _call(arg: string): Promise<string> {
        return new Promise<string>((resolve) => {
            exec('/home/jannis/parmelae-bot/cmd/statusminecraft', (error, stdout, stderr) => {
                if (error) {
                    resolve('Error: ' + stderr.trim());
                } else {
                    resolve(stdout.trim());
                }
            });
        });
    }
}