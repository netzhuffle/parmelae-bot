import { injectable } from 'inversify';
import { Config } from '../Config';
import { Tool } from 'langchain/tools';

@injectable()
export class GptModelQueryTool extends Tool {
  name = 'gpt-model-query';

  description =
    'Use to find out if ChatGPT or if GPT-4 is used. Returns the name of the used model. Input should be an empty string.';

  constructor(private readonly config: Config) {
    super();
  }

  protected _call(): Promise<string> {
    return Promise.resolve(this.config.useGpt4 ? 'GPT-4' : 'ChatGPT');
  }
}
