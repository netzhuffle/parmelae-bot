import { Tool } from "langchain/agents";
import { injectable } from "inversify";
import { Config } from "../Config";

@injectable()
export class GptModelSetterTool extends Tool {
    name = 'gpt-model-set';

    description = 'Use set if ChatGPT or if GPT-4 should be used. Input should be either "ChatGPT" or "GPT-4".';

    constructor(
        private readonly config: Config,
    ) {
        super();
    }

    protected _call(arg: string): Promise<string> {
        const model = arg.trim().toLowerCase();

        if (model !== 'chatgpt' && model !== 'gpt-4') {
            return Promise.resolve('Error: Unknown model name.');
        }

        this.config.useGpt4 = model === 'gpt-4';
        return Promise.resolve(
            'Success: ' +
            (this.config.useGpt4 ? 'GPT-4' : 'ChatGPT') +
            ' will be used from now on.'
        );
    }
}