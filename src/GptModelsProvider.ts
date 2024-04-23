import { ChatOpenAI } from '@langchain/openai';
import { NotExhaustiveSwitchError } from './NotExhaustiveSwitchError.js';
import { OpenAIEmbeddings } from '@langchain/openai';

export const GptModels = {
  Turbo: 'GPT-3.5 Turbo',
  Gpt4Turbo: 'GPT-4 Turbo',
} as const;

export type GptModel = (typeof GptModels)[keyof typeof GptModels];

/** Provider for LangChain LLM models for dependency injection. */
export class GptModelsProvider {
  /** LangChain chat model of GPT-3.5 Turbo. */
  public readonly turbo: ChatOpenAI;
  /** LangChain chat model of GPT-3.5 Turbo with temperature 0. */
  public readonly turboStrict: ChatOpenAI;
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
    /** LangChain chat model of GPT-4 Turbo. */
    gpt4Turbo: ChatOpenAI;
    /** LangChain chat model of GPT-4 Turbo with temperature 0. */
    gpt4TurboStrict: ChatOpenAI;
    /** LangChain embeddings model. */
    embeddings: OpenAIEmbeddings;
  }) {
    this.turbo = models.turbo;
    this.turboStrict = models.turboStrict;
    this.gpt4Turbo = models.gpt4Turbo;
    this.gpt4TurboStrict = models.gpt4TurboStrict;
    this.embeddings = models.embeddings;
  }

  /** Returns a ChatGPT model. */
  getModel(model: GptModel, needsVision = false): ChatOpenAI {
    if (needsVision) {
      return this.gpt4Turbo;
    }

    switch (model) {
      case GptModels.Turbo:
        return this.turbo;
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
      case GptModels.Gpt4Turbo:
        return this.gpt4TurboStrict;
      default:
        throw new NotExhaustiveSwitchError(model);
    }
  }
}
