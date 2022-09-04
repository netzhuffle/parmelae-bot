import {Prisma, PrismaClient} from "@prisma/client";
import assert from "assert";
import TelegramBot from "node-telegram-bot-api";
import {singleton} from "tsyringe";
import {MessageWithUser, MessageWithUserAndReplyToAndReplyToUser} from "./Types";

/** Number of milliseconds in a day */
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

/** Number of milliseconds in 7 days */
const SEVEN_DAYS_IN_MILLISECONDS = 7 * DAY_IN_MILLISECONDS;

/** Repository for messages */
@singleton()
export class MessageRepository {
    constructor(private readonly prisma: PrismaClient) {
    }

    /** Returns the message for a Telegram message if found in the database. */
    async get(message: TelegramBot.Message): Promise<MessageWithUserAndReplyToAndReplyToUser | null> {
        return this.prisma.message.findUnique({
            where: {
                id: this.getMessageId(message),
            },
            include: {
                from: true,
                replyToMessage: {
                    include: {
                        from: true,
                    }
                },
            }
        });
    }

    /** Stores a message and its author. */
    async store(message: TelegramBot.Message): Promise<void> {
        // Only store messages from a user that contain text.
        assert(message.from);
        assert(message.text);

        const databaseMessage = await this.prisma.message.findUnique({
            where: {
                id: this.getMessageId(message),
            },
        });
        if (databaseMessage) {
            // Message already stored.
            return;
        }

        const replyToMessage = message.reply_to_message ? await this.connectReplyToMessage(message.reply_to_message) : null;
        await this.prisma.message.create({
            data: {
                messageId: message.message_id,
                chat: this.connectChat(message.chat),
                sentAt: this.getDate(message.date),
                editedAt: this.getOptionalDate(message.edit_date),
                text: message.text,
                replyToMessage: replyToMessage ?? undefined,
                from: this.connectUser(message.from),
            }
        });
    }

    /** Gets the last message from a chat that doesn’t have an excluded messageId, if there is any. */
    async getLastChatMessage(chatId: bigint | number, excludedMessageIds: number[]): Promise<MessageWithUser | null> {
        return this.prisma.message.findFirst({
            where: {
                chatId: chatId,
                messageId: {
                    notIn: excludedMessageIds,
                }
            },
            orderBy: {
                messageId: 'desc',
            },
            include: {
                from: true,
            },
        });
    }

    /**
     * Deletes and returns old messages.
     * @return The deleted messages
     */
    async deleteOld(): Promise<MessageWithUser[]> {
        const date7DaysAgo = new Date(Date.now() - SEVEN_DAYS_IN_MILLISECONDS);
        const where7DaysAgo: Prisma.MessageWhereInput = {
            sentAt: {
                lt: date7DaysAgo,
            },
        };
        const messagesToDelete = await this.prisma.message.findMany({
            where: where7DaysAgo,
            include: {
                from: true,
            }
        });
        await this.prisma.message.deleteMany({
            where: where7DaysAgo,
        });
        return messagesToDelete;
    }

    private getMessageId(message: TelegramBot.Message): Prisma.MessageIdCompoundUniqueInput {
        return {
            messageId: message.message_id,
            chatId: message.chat.id,
        };
    }

    private connectChat(chat: TelegramBot.Chat): Prisma.ChatCreateNestedOneWithoutMessagesInput {
        return {
            connectOrCreate: {
                where: {
                    id: chat.id
                },
                create: {
                    id: chat.id,
                    type: chat.type,
                    title: chat.title,
                    username: chat.username,
                    firstName: chat.first_name,
                    lastName: chat.last_name,
                }
            }
        };
    }

    private connectUser(user: TelegramBot.User): Prisma.UserCreateNestedOneWithoutMessagesInput {
        return {
            connectOrCreate: {
                where: {
                    id: user.id
                },
                create: {
                    id: user.id,
                    isBot: user.is_bot,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    username: user.username,
                    languageCode: user.language_code,
                }
            }
        };
    }

    private async connectReplyToMessage(message: TelegramBot.Message): Promise<Prisma.MessageCreateNestedOneWithoutRepliesInput | null> {
        // Querying to make sure the message replied to exists in the database.
        const replyToMessage = await this.prisma.message.findUnique({
            where: {
                id: this.getMessageId(message),
            },
        });

        if (!replyToMessage) {
            return null;
        }

        return {
            connect: {
                id: {
                    messageId: replyToMessage.messageId,
                    chatId: replyToMessage.chatId,
                },
            }
        };
    }

    private getDate(unixTimestamp: number): Date {
        return new Date(unixTimestamp * 1000);
    }

    private getOptionalDate(unixTimestamp?: number): Date | null {
        return unixTimestamp ? this.getDate(unixTimestamp) : null;
    }
}
