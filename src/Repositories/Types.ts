/**
 * File for custom types used in repository signatures.
 *
 * While Prisma creates and exports most types, some need to be created manually.
 * See https://www.prisma.io/docs/concepts/components/prisma-client/advanced-type-safety/operating-against-partial-structures-of-model-types#problem-using-variations-of-the-generated-model-type.
 */

import {
  MessageModel,
  MessageDefaultArgs,
  MessageGetPayload,
} from '../generated/prisma/models/Message.js';

/* eslint-disable @typescript-eslint/no-unused-vars */

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type HasTelegramMessageId = {
  telegramMessageId: NonNullable<MessageModel['telegramMessageId']>;
};

/** Message coming from Telegram. */
export type TelegramMessage = MessageModel & HasTelegramMessageId;

/** Type value for a message including relations. */
const MESSAGE_WITH_RELATIONS = {
  include: {
    chat: true,
    from: true,
    replyToMessage: {
      include: {
        from: true,
      },
    },
    newChatMembers: {
      include: {
        user: true,
      },
    },
  },
} satisfies MessageDefaultArgs;

/** Message including relations. */
export type MessageWithRelations = MessageGetPayload<
  typeof MESSAGE_WITH_RELATIONS
>;

/** Telegram message including relations. */
export type TelegramMessageWithRelations = MessageWithRelations &
  HasTelegramMessageId & {
    replyToMessage:
      | (MessageWithRelations['replyToMessage'] & HasTelegramMessageId)
      | null;
  };

/** Message including relations without id field. */
export type UnstoredMessageWithRelations = Omit<
  MessageWithRelations,
  'id' | 'replyToMessage'
> &
  HasTelegramMessageId & {
    replyToMessage: (Omit<MessageModel, 'id'> & HasTelegramMessageId) | null;
  };

/** Type value for a message including the user relation. */
const MESSAGE_WITH_USER_RELATION = {
  include: {
    from: true,
  },
} satisfies MessageDefaultArgs;

/** Message including the user relation. */
export type MessageWithUser = MessageGetPayload<
  typeof MESSAGE_WITH_USER_RELATION
>;

/** Type value for a message including the reply-to relation. */
const MESSAGE_WITH_REPLY_TO_RELATION = {
  include: {
    replyToMessage: true,
  },
} satisfies MessageDefaultArgs;

/** Telegram message including the reply-to relation. */
export type TelegramMessageWithReplyTo = MessageGetPayload<
  typeof MESSAGE_WITH_REPLY_TO_RELATION
> &
  HasTelegramMessageId;

/** Type value for a message including user and tool messages relations. */
const MESSAGE_WITH_USER_AND_TOOL_MESSAGES = {
  include: {
    from: true,
    toolMessages: true,
  },
} satisfies MessageDefaultArgs;

/** Message including user and tool messages relations. */
export type MessageWithUserAndToolMessages = MessageGetPayload<
  typeof MESSAGE_WITH_USER_AND_TOOL_MESSAGES
>;

/** Type value for a message including user, reply-to, and tool messages relations. */
const MESSAGE_WITH_USER_REPLY_TO_AND_TOOL_MESSAGES = {
  include: {
    from: true,
    replyToMessage: true,
    toolMessages: true,
  },
} satisfies MessageDefaultArgs;

/** Message including user, reply-to, and tool messages relations. */
export type MessageWithUserReplyToAndToolMessages = MessageGetPayload<
  typeof MESSAGE_WITH_USER_REPLY_TO_AND_TOOL_MESSAGES
>;

/** Type value for a message including user, reply-to, tool messages, and tool call messages relations. */
const MESSAGE_WITH_USER_REPLY_TO_TOOL_MESSAGES_AND_TOOL_CALL_MESSAGES = {
  include: {
    from: true,
    replyToMessage: true,
    toolMessages: true,
    toolCallMessages: {
      include: {
        from: true,
        replyToMessage: true,
        toolMessages: true,
      },
    },
  },
} satisfies MessageDefaultArgs;

/** Message including user, reply-to, tool messages, and tool call messages relations. */
export type MessageWithUserReplyToToolMessagesAndToolCallMessages =
  MessageGetPayload<
    typeof MESSAGE_WITH_USER_REPLY_TO_TOOL_MESSAGES_AND_TOOL_CALL_MESSAGES
  >;
