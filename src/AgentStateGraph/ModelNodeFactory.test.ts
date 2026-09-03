import { describe, it, expect, mock } from 'bun:test';

import { AIMessageChunk } from '@langchain/core/messages';

import { ChatOpenAiFake } from '../Fakes/ChatOpenAiFake.js';
import { ModelNodeFactory } from './ModelNodeFactory.js';
import { StateAnnotation } from './StateAnnotation.js';

describe('ModelNodeFactory', () => {
  it('returns a function that calls model.invoke and returns the response', async () => {
    // Arrange
    const aiMessage = new AIMessageChunk('hello');
    const fakeModel = new ChatOpenAiFake(aiMessage);
    const factory = new ModelNodeFactory();
    const messages = [aiMessage];
    const state: typeof StateAnnotation.State = {
      messages,
      toolExecution: {},
      toolCallMessageIds: [],
      pendingImageGenerationStatus: false,
    };
    const node = factory.create(fakeModel);

    // Act
    const result = await node(state);

    // Assert
    expect(fakeModel.request).toStrictEqual(messages);
    expect(result).toEqual({ messages: [aiMessage], pendingImageGenerationStatus: false });
  });

  it('wraps the model call with upload-photo status when image generation is pending', async () => {
    const aiMessage = new AIMessageChunk('hello');
    const fakeModel = new ChatOpenAiFake(aiMessage);
    const runWithUploadPhotoStatusMock = mock(() => {
      return;
    });
    const runWithUploadPhotoStatus = async <Result>(task: () => Promise<Result>) => {
      runWithUploadPhotoStatusMock();
      return task();
    };
    const factory = new ModelNodeFactory();
    const messages = [aiMessage];
    const state: typeof StateAnnotation.State = {
      messages,
      toolExecution: {},
      toolCallMessageIds: [],
      pendingImageGenerationStatus: true,
    };
    const node = factory.create(fakeModel, {
      runWithUploadPhotoStatus,
      useUploadPhotoStatus: true,
    });

    const result = await node(state);

    expect(runWithUploadPhotoStatusMock).toHaveBeenCalledTimes(1);
    expect(fakeModel.request).toStrictEqual(messages);
    expect(result).toEqual({ messages: [aiMessage], pendingImageGenerationStatus: false });
  });
});
