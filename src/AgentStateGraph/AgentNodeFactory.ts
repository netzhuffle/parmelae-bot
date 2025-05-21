import { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { AIMessageChunk } from '@langchain/core/messages';
import { Runnable } from '@langchain/core/runnables';
import { MessagesAnnotation } from '@langchain/langgraph';
import { injectable } from 'inversify';

@injectable()
export class AgentNodeFactory {
  create(model: Runnable<BaseLanguageModelInput, AIMessageChunk>) {
    return async ({ messages }: typeof MessagesAnnotation.State) => {
      const response = await model.invoke(messages);
      return { messages: [response] };
    };
  }
}
