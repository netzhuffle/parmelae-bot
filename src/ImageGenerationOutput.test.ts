import { describe, expect, it } from 'bun:test';

import { AIMessage } from '@langchain/core/messages';

import { getImageGenerationOutputs } from './ImageGenerationOutput.js';

describe('getImageGenerationOutputs', () => {
  it('extracts generated images from LangChain Responses tool outputs', () => {
    const outputs = getImageGenerationOutputs([
      new AIMessage({
        content: '',
        additional_kwargs: {
          tool_outputs: [
            {
              type: 'image_generation_call',
              result: 'base64-image-data',
              revised_prompt: 'A generated image',
            },
          ],
        },
      }),
    ]);

    expect(outputs).toEqual([
      {
        dataUrl: 'data:image/png;base64,base64-image-data',
        caption: 'A generated image',
      },
    ]);
  });

  it('uses a fallback caption when OpenAI does not include a revised prompt', () => {
    const outputs = getImageGenerationOutputs([
      {
        type: 'ai',
        content: '',
        additional_kwargs: {
          tool_outputs: [
            {
              type: 'image_generation_call',
              result: 'base64-image-data',
            },
          ],
        },
      },
    ]);

    expect(outputs).toEqual([
      {
        dataUrl: 'data:image/png;base64,base64-image-data',
        caption: 'Generiertes Bild',
      },
    ]);
  });
});
