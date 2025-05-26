/**
 * File for custom types used in repository signatures.
 *
 * While Prisma creates and exports most types, some need to be created manually.
 * See https://www.prisma.io/docs/concepts/components/prisma-client/advanced-type-safety/operating-against-partial-structures-of-model-types#problem-using-variations-of-the-generated-model-type.
 */

import { Message, Prisma } from '@prisma/client';

/* eslint-disable @typescript-eslint/no-unused-vars */

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type HasTelegramMessageId = {
  telegramMessageId: NonNullable<Message['telegramMessageId']>;
};

/** Message coming from Telegram. */
export type TelegramMessage = Message & HasTelegramMessageId;

/** Type value for a message including relations. */
const MESSAGE_WITH_RELATIONS = Prisma.validator<Prisma.MessageDefaultArgs>()({
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
});

/** Message including relations. */
export type MessageWithRelations = Prisma.MessageGetPayload<
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
    replyToMessage: (Omit<Message, 'id'> & HasTelegramMessageId) | null;
  };

/** Type value for a message including the user relation. */
const MESSAGE_WITH_USER_RELATION =
  Prisma.validator<Prisma.MessageDefaultArgs>()({
    include: {
      from: true,
    },
  });

/** Message including the user relation. */
export type MessageWithUser = Prisma.MessageGetPayload<
  typeof MESSAGE_WITH_USER_RELATION
>;

/** Type value for a message including the reply-to relation. */
const MESSAGE_WITH_REPLY_TO_RELATION =
  Prisma.validator<Prisma.MessageDefaultArgs>()({
    include: {
      replyToMessage: true,
    },
  });

/** Telegram message including the reply-to relation. */
export type TelegramMessageWithReplyTo = Prisma.MessageGetPayload<
  typeof MESSAGE_WITH_REPLY_TO_RELATION
> &
  HasTelegramMessageId;

/** Type value for a message including user and tool messages relations. */
const MESSAGE_WITH_USER_AND_TOOL_MESSAGES =
  Prisma.validator<Prisma.MessageDefaultArgs>()({
    include: {
      from: true,
      toolMessages: true,
    },
  });

/** Message including user and tool messages relations. */
export type MessageWithUserAndToolMessages = Prisma.MessageGetPayload<
  typeof MESSAGE_WITH_USER_AND_TOOL_MESSAGES
>;

/** Type value for a message including user, reply-to, and tool messages relations. */
const MESSAGE_WITH_USER_REPLY_TO_AND_TOOL_MESSAGES =
  Prisma.validator<Prisma.MessageDefaultArgs>()({
    include: {
      from: true,
      replyToMessage: true,
      toolMessages: true,
    },
  });

/** Message including user, reply-to, and tool messages relations. */
export type MessageWithUserReplyToAndToolMessages = Prisma.MessageGetPayload<
  typeof MESSAGE_WITH_USER_REPLY_TO_AND_TOOL_MESSAGES
>;

/** Type value for a message including user, reply-to, tool messages, and tool call messages relations. */
const MESSAGE_WITH_USER_REPLY_TO_TOOL_MESSAGES_AND_TOOL_CALL_MESSAGES =
  Prisma.validator<Prisma.MessageDefaultArgs>()({
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
  });

/** Message including user, reply-to, tool messages, and tool call messages relations. */
export type MessageWithUserReplyToToolMessagesAndToolCallMessages =
  Prisma.MessageGetPayload<
    typeof MESSAGE_WITH_USER_REPLY_TO_TOOL_MESSAGES_AND_TOOL_CALL_MESSAGES
  >;
