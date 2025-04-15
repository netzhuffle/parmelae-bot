import { injectable } from 'inversify';
import { Config } from '../Config.js';
import { Tool } from '@langchain/core/tools';
import { GptModels } from '../GptModelsProvider.js';

@injectable()
export class GptModelSetterTool extends Tool {
  name = 'gpt-model-set';

  description = `Use set which GPT language model should be used. Input should be "${GptModels.Cheap}" or "${GptModels.Advanced}".`;

  constructor(private readonly config: Config) {
    super();
  }

  protected _call(arg: string): Promise<string> {
    switch (arg.trim()) {
      case GptModels.Cheap:
        this.config.gptModel = GptModels.Cheap;
        break;
      case GptModels.Advanced:
        this.config.gptModel = GptModels.Advanced;
        break;
      default:
        return Promise.resolve(
          `Error: Unknown model name. Use "${GptModels.Cheap}" or "${GptModels.Advanced}".`,
        );
    }

    return Promise.resolve(
      `Success: ${this.config.gptModel} will be used from now on.`,
    );
  }
}
