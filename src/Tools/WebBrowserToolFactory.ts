import { injectable } from "inversify";
import { GptModelsProvider } from "../GptModelsProvider";
import { CallbackManager } from "langchain/callbacks";
import { WebBrowser } from "langchain/tools/webbrowser";
import { Config } from "../Config";

@injectable()
export class WebBrowserToolFactory {
    constructor(
        private readonly config: Config,
        private readonly gptModelsProvider: GptModelsProvider,
        private readonly callbackManager: CallbackManager,
    ) { }

    create(): WebBrowser {
        return new WebBrowser({
            model: this.config.useGpt4 ? this.gptModelsProvider.gpt4Strict : this.gptModelsProvider.chatGptStrict,
            embeddings: this.gptModelsProvider.embeddings,
            verbose: true,
            callbackManager: this.callbackManager,
        });
    }
}