import { AIMessage } from '@langchain/core/messages';

type AiMessageContentCarrier = Pick<AIMessage, 'content'> & {
  contentBlocks?: {
    type: string;
    text?: string;
  }[];
};

/** Extracts plain text from AI message content-like values. */
export function getAiMessageTextChunkContent(message: AiMessageContentCarrier): string {
  if (typeof message.content === 'string') {
    return message.content;
  }

  if (Array.isArray(message.content)) {
    return message.content
      .filter(
        (
          contentBlock,
        ): contentBlock is {
          type: string;
          text: string;
        } => {
          return (
            typeof contentBlock === 'object' &&
            contentBlock !== null &&
            'type' in contentBlock &&
            contentBlock.type === 'text' &&
            'text' in contentBlock &&
            typeof contentBlock.text === 'string'
          );
        },
      )
      .map((contentBlock) => contentBlock.text)
      .join('\n');
  }

  return (
    message.contentBlocks
      ?.filter((contentBlock) => contentBlock.type === 'text' && contentBlock.text !== undefined)
      .map((contentBlock) => contentBlock.text)
      .join('\n') ?? ''
  );
}

/** Extracts plain text from an AI message across both Completions and Responses API shapes. */
export function getAiMessageTextContent(message: AIMessage): string {
  return getAiMessageTextChunkContent(message);
}

/** Finds the last AI-authored text content in a LangGraph/LangChain message list. */
export function getLastAiMessageTextContent(messages: unknown[]): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message instanceof AIMessage) {
      return getAiMessageTextContent(message);
    }

    if (
      typeof message === 'object' &&
      message !== null &&
      'type' in message &&
      message.type === 'ai' &&
      'content' in message
    ) {
      return getAiMessageTextChunkContent(message as AiMessageContentCarrier);
    }
  }

  return null;
}
