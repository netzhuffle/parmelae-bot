import { Tool } from "langchain/agents";
import { singleton } from "tsyringe";
import { Config } from "../Config";

@singleton()
export class GptModelQueryTool extends Tool {
    name = 'gpt-model-query';

    description = 'Use to find out if ChatGPT or if GPT-4 is used. Returns the name of the used model. Input should be an empty string.';

    constructor(
        private readonly config: Config,
    ) {
        super();
    }

    protected _call(arg: string): Promise<string> {
        return Promise.resolve(this.config.useGpt4 ? 'GPT-4' : 'ChatGPT');
    }
}