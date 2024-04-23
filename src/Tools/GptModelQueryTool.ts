import { injectable } from 'inversify';
import { Config } from '../Config.js';
import { Tool } from 'langchain/tools';

@injectable()
export class GptModelQueryTool extends Tool {
  name = 'gpt-model-query';

  description =
    'Use to find out which GPT language model is used. Returns the name of the used model, by example GPT-3.5 Turbo or GPT-4 Turbo. Input should be an empty string.';

  constructor(private readonly config: Config) {
    super();
  }

  protected _call(): Promise<string> {
    return Promise.resolve(this.config.gptModel);
  }
}
