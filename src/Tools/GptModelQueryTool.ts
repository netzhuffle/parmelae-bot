import { injectable } from 'inversify';
import { Config } from '../Config.js';
import { Tool } from '@langchain/core/tools';

@injectable()
export class GptModelQueryTool extends Tool {
  name = 'gpt-model-query';

  description =
    'Use to find out which GPT language model is used. Returns the name of the used model, by example gpt-4o-mini or GPT-4o. Input should be an empty string.';

  constructor(private readonly config: Config) {
    super();
  }

  protected _call(): Promise<string> {
    return Promise.resolve(this.config.gptModel);
  }
}
