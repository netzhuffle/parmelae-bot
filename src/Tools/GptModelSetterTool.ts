import { injectable } from 'inversify';
import { Config } from '../Config.js';
import { Tool } from 'langchain/tools';
import { GptModels } from '../GptModelsProvider.js';

@injectable()
export class GptModelSetterTool extends Tool {
  name = 'gpt-model-set';

  description =
    'Use set which GPT language model should be used. Input should be "gpt-4o-mini" or "GPT-4o".';

  constructor(private readonly config: Config) {
    super();
  }

  protected _call(arg: string): Promise<string> {
    switch (arg.trim()) {
      case 'gpt-4o-mini':
        this.config.gptModel = GptModels.Cheap;
        break;
      case 'GPT-4o':
        this.config.gptModel = GptModels.Advanced;
        break;
      default:
        return Promise.resolve(
          'Error: Unknown model name. Use "gpt-4o-mini" or "GPT-4o".',
        );
    }

    return Promise.resolve(
      `Success: ${this.config.gptModel} will be used from now on.`,
    );
  }
}
