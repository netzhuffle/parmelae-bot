import { injectable } from 'inversify';
import { GptModelsProvider } from '../GptModelsProvider.js';
import { WebBrowser } from '@langchain/classic/tools/webbrowser';
import { Config } from '../Config.js';

@injectable()
export class WebBrowserToolFactory {
  constructor(
    private readonly config: Config,
    private readonly gptModelsProvider: GptModelsProvider,
  ) {}

  create(): WebBrowser {
    const tool = new WebBrowser({
      model: this.gptModelsProvider.getModel(this.config.gptModel),
      embeddings: this.gptModelsProvider.embeddings,
    });

    return tool;
  }
}
