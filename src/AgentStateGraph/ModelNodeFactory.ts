import { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { AIMessageChunk } from '@langchain/core/messages';
import { Runnable } from '@langchain/core/runnables';
import { injectable } from 'inversify';
import { StateAnnotation } from './StateAnnotation.js';

@injectable()
export class ModelNodeFactory {
  create(model: Runnable<BaseLanguageModelInput, AIMessageChunk>) {
    return async ({ messages }: typeof StateAnnotation.State) => {
      const response = await model.invoke(messages);
      return { messages: [response] };
    };
  }
}
