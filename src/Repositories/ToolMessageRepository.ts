import { injectable } from 'inversify';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * Repository for managing tool message persistence.
 */
@injectable()
export class ToolMessageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Store a tool message response in the database.
   */
  async store(data: {
    toolCallId: string;
    text: string;
    messageId: number;
  }): Promise<void> {
    await this.prisma.toolMessage.create({
      data: {
        toolCallId: data.toolCallId,
        text: data.text,
        messageId: data.messageId,
      },
    });
  }
}
