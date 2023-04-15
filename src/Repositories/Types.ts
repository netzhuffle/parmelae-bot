/**
 * File for custom types used in repository signatures.
 *
 * While Prisma creates and exports most types, some need to be created manually.
 * See https://www.prisma.io/docs/concepts/components/prisma-client/advanced-type-safety/operating-against-partial-structures-of-model-types#problem-using-variations-of-the-generated-model-type.
 */

import {Prisma} from "@prisma/client";

/** Validator for Message including the User relation. */
const messageWithUser = Prisma.validator<Prisma.MessageArgs>()({
    include: {
        from: true,
    },
});

/** Message including the User relation. */
export type MessageWithUser = Prisma.MessageGetPayload<typeof messageWithUser>;

/** Validator for Message including the User and ReplyToMessage relations. */
const messageWithUserAndReplyToMessage = Prisma.validator<Prisma.MessageArgs>()({
    include: {
        from: true,
        replyToMessage: true,
    },
});

/** Message including the User and ReplyToMessage relations. */
export type MessageWithUserAndReplyToMessage = Prisma.MessageGetPayload<typeof messageWithUserAndReplyToMessage>;
