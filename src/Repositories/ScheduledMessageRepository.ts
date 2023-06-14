import { PrismaClient, ScheduledMessage } from '@prisma/client';
import { injectable } from 'inversify';

/** Repository for scheduled messages */
@injectable()
export class ScheduledMessageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** Stores a scheduled message. */
  create(
    sendAt: Date,
    text: string,
    chatId: bigint,
    fromId: bigint,
  ): Promise<ScheduledMessage> {
    return this.prisma.scheduledMessage.create({
      data: {
        chatId,
        fromId,
        sendAt,
        text,
      },
    });
  }

  /** Deletes a scheduled message. */
  async delete(id: number): Promise<ScheduledMessage> {
    return this.prisma.scheduledMessage.delete({
      where: { id },
    });
  }

  /** Returns the list of all scheduled messages. */
  retrieveAll(): Promise<ScheduledMessage[]> {
    return this.prisma.scheduledMessage.findMany();
  }
}
