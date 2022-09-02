import {Message, Prisma, PrismaClient} from "@prisma/client";
import assert from "assert";
import TelegramBot from "node-telegram-bot-api";
import {singleton} from "tsyringe";

/** Repository for messages */
@singleton()
export class MessageRepository {
    constructor(private readonly prisma: PrismaClient) {
    }

    /** Stores a message and its author. */
    async store(message: TelegramBot.Message): Promise<void> {
        // Only store messages from a user that contain text.
        assert(message.from);
        assert(message.text);

        const databaseMessage = await this.prisma.message.findUnique({
            where: {id: message.message_id},
        });
        if (databaseMessage) {
            // Message already stored.
            return;
        }

        const replyToMessage = message.reply_to_message ? await this.connectReplyToMessage(message.reply_to_message) : null;
        await this.prisma.message.create({
            data: {
                id: message.message_id,
                sentAt: this.getDate(message.date),
                editedAt: this.getOptionalDate(message.edit_date),
                text: message.text,
                replyToMessage: replyToMessage ?? undefined,
                from: this.connectUser(message.from),
                chat: this.connectChat(message.chat),
            }
        });
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
            where: {id: message.message_id},
        });

        if (!replyToMessage) {
            return null;
        }

        return {
            connect: {
                id: replyToMessage.id,
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
