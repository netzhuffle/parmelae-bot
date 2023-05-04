/**
 * File for custom types used in repository signatures.
 *
 * While Prisma creates and exports most types, some need to be created manually.
 * See https://www.prisma.io/docs/concepts/components/prisma-client/advanced-type-safety/operating-against-partial-structures-of-model-types#problem-using-variations-of-the-generated-model-type.
 */

import { Prisma } from '@prisma/client';

/** Type value for a message including relations. */
const MESSAGE_WITH_RELATIONS = Prisma.validator<Prisma.MessageArgs>()({
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

/** Type value for a message including the user relation. */
const MESSAGE_WITH_USER_RELATION = Prisma.validator<Prisma.MessageArgs>()({
  include: {
    from: true,
  },
});

/** Message including the user relation. */
export type MessageWithUser = Prisma.MessageGetPayload<
  typeof MESSAGE_WITH_USER_RELATION
>;

/** Type value for a message including the reply-to relation. */
const MESSAGE_WITH_REPLY_TO_RELATION = Prisma.validator<Prisma.MessageArgs>()({
  include: {
    replyToMessage: true,
  },
});

/** Message including the reply-to relation. */
export type MessageWithReplyTo = Prisma.MessageGetPayload<
  typeof MESSAGE_WITH_REPLY_TO_RELATION
>;

/** Type value for a message including the user and reply-to relations. */
const MESSAGE_WITH_USER_AND_REPLY_TO_RELATIONS =
  Prisma.validator<Prisma.MessageArgs>()({
    include: {
      from: true,
      replyToMessage: true,
    },
  });

/** Message including the user and reply-to relations. */
export type MessageWithUserAndReplyTo = Prisma.MessageGetPayload<
  typeof MESSAGE_WITH_USER_AND_REPLY_TO_RELATIONS
>;
