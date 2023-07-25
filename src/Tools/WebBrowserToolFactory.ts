import { injectable } from 'inversify';
import { GptModelsProvider } from '../GptModelsProvider';
import { WebBrowser } from 'langchain/tools/webbrowser';
import { Config } from '../Config';

@injectable()
export class WebBrowserToolFactory {
  constructor(
    private readonly config: Config,
    private readonly gptModelsProvider: GptModelsProvider,
  ) {}

  create(): WebBrowser {
    const tool = new WebBrowser({
      model: this.config.useGpt4
        ? this.gptModelsProvider.gpt4Strict
        : this.gptModelsProvider.chatGptStrict,
      embeddings: this.gptModelsProvider.embeddings,
      verbose: true,
    });
    tool.description = 'useful for when you need to find something on or summarize a webpage. input should be a comma separated list of "ONE valid http URL including protocol","what you want to find on the page or empty string for a summary". Only use for URLs given by a user or by other tools (by example the search tool). Use the search tool if you need to use the internet but were not given a URL.';

    return tool;
  }
}
