import type { ServerTool } from '@langchain/core/tools';

export const IMAGE_GENERATION_TOOL_NAME = 'image_generation';

export const imageGenerationTool = {
  type: IMAGE_GENERATION_TOOL_NAME,
  action: 'generate',
  model: 'gpt-image-2',
  output_format: 'png',
  quality: 'medium',
} satisfies ServerTool;
