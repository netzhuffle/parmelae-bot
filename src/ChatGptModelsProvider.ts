import {ChatOpenAI} from "langchain/chat_models/openai";
import {NotExhaustiveSwitchError} from "./NotExhaustiveSwitchError";

export const ChatGptModels = {
    ChatGpt: 'ChatGPT',
    Gpt4: 'GPT-4',
} as const;

export type ChatGptModel = typeof ChatGptModels[keyof typeof ChatGptModels];

/** Provider for LangChain chat models for dependency injection. */
export class ChatGptModelsProvider {
    /** LangChain chat model of GPT-3.5-Turbo. */
    public readonly chatGpt: ChatOpenAI;
    /** LangChain chat model of GPT-3.5-Turbo with temperature 0. */
    public readonly chatGptStrict: ChatOpenAI;
    /** LangChain chat model of GPT-4. */
    public readonly gpt4: ChatOpenAI;

    constructor(
        models: {
            /** LangChain chat model of GPT-3.5-Turbo. */
            chatGpt: ChatOpenAI,
            /** LangChain chat model of GPT-3.5-Turbo with temperature 0. */
            chatGptStrict: ChatOpenAI,
            /** LangChain chat model of GPT-4. */
            gpt4: ChatOpenAI,
        },
    ) {
        this.chatGpt = models.chatGpt;
        this.chatGptStrict = models.chatGptStrict;
        this.gpt4 = models.gpt4;
    }

    /** Returns a ChatGPT model. */
    getModel(model: ChatGptModel): ChatOpenAI {
        switch (model) {
            case ChatGptModels.ChatGpt:
                return this.chatGpt;
            case ChatGptModels.Gpt4:
                return this.gpt4;
            default:
                throw new NotExhaustiveSwitchError(model);
        }
    }
}