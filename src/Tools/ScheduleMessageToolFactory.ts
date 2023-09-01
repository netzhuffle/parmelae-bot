import { injectable } from 'inversify';
import { ScheduleMessageTool } from './ScheduleMessageTool.js';
import { ScheduledMessageRepository } from '../Repositories/ScheduledMessageRepository.js';
import { ScheduledMessageService } from '../ScheduledMessageService.js';

/** Factory for the schedule message tool. */
@injectable()
export class ScheduleMessageToolFactory {
  constructor(
    private readonly repository: ScheduledMessageRepository,
    private readonly service: ScheduledMessageService,
  ) {}

  /**
   * Creates the schedule message tool.
   *
   * @param chatId - The chat to write in.
   * @param fromId - The user who asked to schedule the message.
   */
  create(chatId: bigint, fromId: bigint): ScheduleMessageTool {
    return new ScheduleMessageTool(
      this.repository,
      this.service,
      chatId,
      fromId,
    );
  }
}
