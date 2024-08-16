import { ChatOpenAI } from '@langchain/openai';
import { NotExhaustiveSwitchError } from './NotExhaustiveSwitchError.js';
import { OpenAIEmbeddings } from '@langchain/openai';

export const GptModels = {
  Cheap: 'gpt-4o-mini',
  Advanced: 'GPT-4o',
} as const;

export type GptModel = (typeof GptModels)[keyof typeof GptModels];

/** Provider for LangChain LLM models for dependency injection. */
export class GptModelsProvider {
  /** LangChain chat model of a cheap, potentially text-only model. */
  public readonly cheap: ChatOpenAI;
  /** LangChain chat model of a cheap, potentially text-only model with temperature 0. */
  public readonly cheapStrict: ChatOpenAI;
  /** LangChain chat model of an advanced, more expensive model with vision. */
  public readonly advanced: ChatOpenAI;
  /** LangChain chat model of an advanced, more expensive model with vision with temperature 0. */
  public readonly advancedStrict: ChatOpenAI;
  /** LangChain embeddings model. */
  public readonly embeddings: OpenAIEmbeddings;

  constructor(models: {
    /** LangChain chat model of a cheap, potentially text-only model. */
    cheap: ChatOpenAI;
    /** LangChain chat model of a cheap, potentially text-only model with temperature 0. */
    cheapStrict: ChatOpenAI;
    /** LangChain chat model of an advanced, more expensive model with vision. */
    advanced: ChatOpenAI;
    /** LangChain chat model of an advanced, more expensive model with vision with temperature 0. */
    advancedStrict: ChatOpenAI;
    /** LangChain embeddings model. */
    embeddings: OpenAIEmbeddings;
  }) {
    this.cheap = models.cheap;
    this.cheapStrict = models.cheapStrict;
    this.advanced = models.advanced;
    this.advancedStrict = models.advancedStrict;
    this.embeddings = models.embeddings;
  }

  /** Returns a ChatGPT model. */
  getModel(model: GptModel, needsVision = false): ChatOpenAI {
    if (needsVision) {
      return this.advanced;
    }

    switch (model) {
      case GptModels.Cheap:
        return this.cheap;
      case GptModels.Advanced:
        return this.advanced;
      default:
        throw new NotExhaustiveSwitchError(model);
    }
  }

  /** Returns a ChatGPT model with temperature 0. */
  getStrictModel(model: GptModel): ChatOpenAI {
    switch (model) {
      case GptModels.Cheap:
        return this.cheapStrict;
      case GptModels.Advanced:
        return this.advancedStrict;
      default:
        throw new NotExhaustiveSwitchError(model);
    }
  }
}
