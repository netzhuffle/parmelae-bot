import { ChatOpenAI } from 'langchain/chat_models/openai';
import { NotExhaustiveSwitchError } from './NotExhaustiveSwitchError.js';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';

export const GptModels = {
  Turbo: 'GPT-3.5 Turbo',
  Gpt4: 'GPT-4',
  Gpt4Turbo: 'GPT-4 Turbo',
} as const;

export type GptModel = (typeof GptModels)[keyof typeof GptModels];

/** Provider for LangChain LLM models for dependency injection. */
export class GptModelsProvider {
  /** LangChain chat model of GPT-3.5 Turbo. */
  public readonly turbo: ChatOpenAI;
  /** LangChain chat model of GPT-3.5 Turbo with temperature 0. */
  public readonly turboStrict: ChatOpenAI;
  /** LangChain chat model of GPT-4. */
  public readonly gpt4: ChatOpenAI;
  /** LangChain chat model of GPT-4 with temperature 0. */
  public readonly gpt4Strict: ChatOpenAI;
  /** LangChain chat model of GPT-4 Turbo. */
  public readonly gpt4Turbo: ChatOpenAI;
  /** LangChain chat model of GPT-4 Turbo with temperature 0. */
  public readonly gpt4TurboStrict: ChatOpenAI;
  /** LangChain embeddings model. */
  public readonly embeddings: OpenAIEmbeddings;

  constructor(models: {
    /** LangChain chat model of GPT-3.5 Turbo. */
    turbo: ChatOpenAI;
    /** LangChain chat model of GPT-3.5 Turbo with temperature 0. */
    turboStrict: ChatOpenAI;
    /** LangChain chat model of GPT-4. */
    gpt4: ChatOpenAI;
    /** LangChain chat model of GPT-4 with temperature 0. */
    gpt4Strict: ChatOpenAI;
    /** LangChain chat model of GPT-4 Turbo. */
    gpt4Turbo: ChatOpenAI;
    /** LangChain chat model of GPT-4 Turbo with temperature 0. */
    gpt4TurboStrict: ChatOpenAI;
    /** LangChain embeddings model. */
    embeddings: OpenAIEmbeddings;
  }) {
    this.turbo = models.turbo;
    this.turboStrict = models.turboStrict;
    this.gpt4 = models.gpt4;
    this.gpt4Strict = models.gpt4Strict;
    this.gpt4Turbo = models.gpt4Turbo;
    this.gpt4TurboStrict = models.gpt4TurboStrict;
    this.embeddings = models.embeddings;
  }

  /** Returns a ChatGPT model. */
  getModel(model: GptModel): ChatOpenAI {
    switch (model) {
      case GptModels.Turbo:
        return this.turbo;
      case GptModels.Gpt4:
        return this.gpt4;
      case GptModels.Gpt4Turbo:
        return this.gpt4Turbo;
      default:
        throw new NotExhaustiveSwitchError(model);
    }
  }

  /** Returns a ChatGPT model with temperature 0. */
  getStrictModel(model: GptModel): ChatOpenAI {
    switch (model) {
      case GptModels.Turbo:
        return this.turboStrict;
      case GptModels.Gpt4:
        return this.gpt4Strict;
      case GptModels.Gpt4Turbo:
        return this.gpt4TurboStrict;
      default:
        throw new NotExhaustiveSwitchError(model);
    }
  }
}
