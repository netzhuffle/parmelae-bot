import { ChatOpenAI, ChatOpenAIFields } from '@langchain/openai';
import { NotExhaustiveSwitchError } from './NotExhaustiveSwitchError.js';
import { OpenAIEmbeddings } from '@langchain/openai';

/** Enum of GPT language models to use. */
export const GptModels = {
  /** Cheap model to use in most cases. Needs text & image inputs, text outputs, function calling. */
  Cheap: 'gpt-5-mini',
  /** Advanced model to use when asked explicitly. Needs text & image inputs, text outputs, function calling. */
  Advanced: 'gpt-5.1',
} as const;

export const GptModelsSettings = {
  [GptModels.Cheap]: {
    model: GptModels.Cheap,
    reasoning: { effort: 'minimal' },
    verbosity: 'low',
  },
  [GptModels.Advanced]: {
    model: GptModels.Advanced,
    reasoning: { effort: 'none' },
    verbosity: 'low',
  },
} satisfies Record<GptModel, ChatOpenAIFields>;

/** Possible GPT language model names. */
export type GptModel = (typeof GptModels)[keyof typeof GptModels];

/** Provider for LangChain LLM models for dependency injection. */
export class GptModelsProvider {
  /** LangChain chat model of a cheap model. */
  public readonly cheap: ChatOpenAI;
  /** LangChain chat model of an advanced, more expensive model. */
  public readonly advanced: ChatOpenAI;
  /** LangChain embeddings model. */
  public readonly embeddings: OpenAIEmbeddings;

  constructor(models: {
    /** LangChain chat model of a cheap model. */
    cheap: ChatOpenAI;
    /** LangChain chat model of an advanced, more expensive model. */
    advanced: ChatOpenAI;
    /** LangChain embeddings model. */
    embeddings: OpenAIEmbeddings;
  }) {
    this.cheap = models.cheap;
    this.advanced = models.advanced;
    this.embeddings = models.embeddings;
  }

  /** Returns a ChatGPT model. */
  getModel(model: GptModel): ChatOpenAI {
    switch (model) {
      case GptModels.Cheap:
        return this.cheap;
      case GptModels.Advanced:
        return this.advanced;
      default:
        throw new NotExhaustiveSwitchError(model);
    }
  }
}
