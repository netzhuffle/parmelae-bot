import { injectable } from 'inversify';
import { Config } from '../Config.js';
import { Tool } from 'langchain/tools';
import { GptModels } from '../GptModelsProvider.js';

@injectable()
export class GptModelSetterTool extends Tool {
  name = 'gpt-model-set';

  description =
    'Use set which GPT language model should be used. Input should be "GPT-3.5 Turbo" or "GPT-4 Turbo".';

  constructor(private readonly config: Config) {
    super();
  }

  protected _call(arg: string): Promise<string> {
    switch (arg.trim()) {
      case 'GPT-3.5 Turbo':
        this.config.gptModel = GptModels.Turbo;
        break;
      case 'GPT-4 Turbo':
        this.config.gptModel = GptModels.Gpt4Turbo;
        break;
      default:
        return Promise.resolve(
          'Error: Unknown model name. Use "GPT-3.5 Turbo" or "GPT-4 Turbo".',
        );
    }

    return Promise.resolve(
      `Success: ${this.config.gptModel} will be used from now on.`,
    );
  }
}
