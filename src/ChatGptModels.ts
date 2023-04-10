import {ChatOpenAI} from "langchain/chat_models/openai";

/** Provider for LangChain chat models for dependency injection */
export class ChatGptModels {
    /** LangChain chat model of GPT-3.5-Turbo */
    public readonly chatGpt: ChatOpenAI;
    /** LangChain chat model of GPT-4 */
    public readonly gpt4: ChatOpenAI;

    constructor(
        models: {
            /** LangChain chat model of GPT-3.5-Turbo */
            chatGpt: ChatOpenAI,
            /** LangChain chat model of GPT-4 */
            gpt4: ChatOpenAI,
        },
    ) {
        this.chatGpt = models.chatGpt;
        this.gpt4 = models.gpt4;
    }
}