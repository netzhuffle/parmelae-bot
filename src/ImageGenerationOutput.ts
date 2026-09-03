import { AIMessage } from '@langchain/core/messages';

export interface ImageGenerationOutput {
  dataUrl: string;
  caption: string;
}

interface ImageGenerationToolOutput {
  result: string;
  revised_prompt?: string;
  type: 'image_generation_call';
}

/** Extracts completed Responses API image generation outputs from LangChain AI messages. */
export function getImageGenerationOutputs(messages: unknown[]): ImageGenerationOutput[] {
  return messages.flatMap((message) =>
    getToolOutputs(message)
      .filter(isImageGenerationToolOutput)
      .map((output) => ({
        dataUrl: `data:image/png;base64,${output.result}`,
        caption: output.revised_prompt ?? 'Generiertes Bild',
      })),
  );
}

function getToolOutputs(message: unknown): unknown[] {
  const additionalKwargs =
    message instanceof AIMessage
      ? message.additional_kwargs
      : isRecord(message) && isRecord(message.additional_kwargs)
        ? message.additional_kwargs
        : undefined;

  if (!isRecord(additionalKwargs) || !Array.isArray(additionalKwargs.tool_outputs)) {
    return [];
  }

  return additionalKwargs.tool_outputs;
}

function isImageGenerationToolOutput(output: unknown): output is ImageGenerationToolOutput {
  return (
    isRecord(output) &&
    output.type === 'image_generation_call' &&
    typeof output.result === 'string' &&
    (output.revised_prompt === undefined || typeof output.revised_prompt === 'string')
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
