import { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { AIMessageChunk } from '@langchain/core/messages';
import { Runnable } from '@langchain/core/runnables';
import { injectable } from 'inversify';

import { StateAnnotation } from './StateAnnotation.js';

interface ModelNodeOptions {
  runWithUploadPhotoStatus?: <Result>(task: () => Promise<Result>) => Promise<Result>;
  useUploadPhotoStatus?: boolean;
}

@injectable()
export class ModelNodeFactory {
  create(model: Runnable<BaseLanguageModelInput, AIMessageChunk>, options: ModelNodeOptions = {}) {
    return async (state: typeof StateAnnotation.State) => {
      const invokeModel = async () => model.invoke(state.messages);
      const shouldUseUploadPhotoStatus =
        options.useUploadPhotoStatus === true && state.pendingImageGenerationStatus;
      const response =
        shouldUseUploadPhotoStatus && options.runWithUploadPhotoStatus
          ? await options.runWithUploadPhotoStatus(invokeModel)
          : await invokeModel();
      return {
        messages: [response],
        pendingImageGenerationStatus: false,
      };
    };
  }
}
