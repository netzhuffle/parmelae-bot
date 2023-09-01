import { ChatOpenAI } from 'langchain/chat_models/openai';
import { NotExhaustiveSwitchError } from './NotExhaustiveSwitchError.js';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';

export const ChatGptModels = {
  ChatGpt: 'ChatGPT',
  Gpt4: 'GPT-4',
} as const;

export type ChatGptModel = (typeof ChatGptModels)[keyof typeof ChatGptModels];

/** Provider for LangChain LLM models for dependency injection. */
export class GptModelsProvider {
  /** LangChain chat model of GPT-3.5-Turbo. */
  public readonly chatGpt: ChatOpenAI;
  /** LangChain chat model of GPT-3.5-Turbo with temperature 0. */
  public readonly chatGptStrict: ChatOpenAI;
  /** LangChain chat model of GPT-4. */
  public readonly gpt4: ChatOpenAI;
  /** LangChain chat model of GPT-4 with temperature 0. */
  public readonly gpt4Strict: ChatOpenAI;
  /** LangChain embeddings model. */
  public readonly embeddings: OpenAIEmbeddings;

  constructor(models: {
    /** LangChain chat model of GPT-3.5-Turbo. */
    chatGpt: ChatOpenAI;
    /** LangChain chat model of GPT-3.5-Turbo with temperature 0. */
    chatGptStrict: ChatOpenAI;
    /** LangChain chat model of GPT-4. */
    gpt4: ChatOpenAI;
    /** LangChain chat model of GPT-4 with temperature 0. */
    gpt4Strict: ChatOpenAI;
    /** LangChain embeddings model. */
    embeddings: OpenAIEmbeddings;
  }) {
    this.chatGpt = models.chatGpt;
    this.chatGptStrict = models.chatGptStrict;
    this.gpt4 = models.gpt4;
    this.gpt4Strict = models.gpt4Strict;
    this.embeddings = models.embeddings;
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
