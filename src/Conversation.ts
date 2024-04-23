import { BaseMessage } from '@langchain/core/messages';

/** A chat conversation. */
export class Conversation {
  constructor(
    public readonly messages: BaseMessage[],
    public readonly needsVision: boolean,
  ) {}
}
