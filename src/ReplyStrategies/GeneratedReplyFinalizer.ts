import { ReplyGeneratorResponse } from '../MessageGenerators/ReplyGenerator.js';

function getExistingFinalMessageIds(response: ReplyGeneratorResponse): number[] {
  if (response.finalMessageIds !== undefined && response.finalMessageIds.length > 0) {
    return response.finalMessageIds;
  }

  return response.finalMessageId === undefined ? [] : [response.finalMessageId];
}

/** Returns the final stored reply message id, sending the response text when needed. */
export async function getFinalReplyMessageId(
  response: ReplyGeneratorResponse,
  sendFinalText: (text: string) => Promise<number>,
): Promise<number> {
  const finalMessageIds = getExistingFinalMessageIds(response);
  return finalMessageIds.at(-1) ?? (await sendFinalText(response.text));
}
