import { singleton } from "tsyringe";
import { GptModelsProvider } from "../GptModelsProvider";
import { CallbackManager } from "langchain/callbacks";
import { WebBrowser } from "langchain/tools/webbrowser";

@singleton()
export class WebBrowserToolFactory {
    constructor(
        private readonly gptModelsProvider: GptModelsProvider,
        private readonly callbackManager: CallbackManager,
    ) { }

    create(): WebBrowser {
        return new WebBrowser({
            model: this.gptModelsProvider.chatGptStrict,
            embeddings: this.gptModelsProvider.embeddings,
            verbose: true,
            callbackManager: this.callbackManager,
        });
    }
}