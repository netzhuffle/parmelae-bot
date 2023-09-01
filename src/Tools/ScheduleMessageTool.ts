import { ScheduledMessageRepository } from '../Repositories/ScheduledMessageRepository.js';
import { Tool } from 'langchain/tools';
import { ScheduledMessageService } from '../ScheduledMessageService.js';
import { ErrorService } from '../ErrorService.js';

/** RegExp to check for numeric string. */
const NUMERIC_REGEXP = /^\d+$/;

/** Number of milliseconds in a second. */
const MILLISECONDS_IN_SECOND = 1000;

/** Tool to schedule a message for later. */
export class ScheduleMessageTool extends Tool {
  name = 'schedule-message';

  description =
    'To schedule a message to send later, by example a reminder. Input should be a comma separated list of "integer amount of seconds in the future","message text".';

  constructor(
    private readonly repository: ScheduledMessageRepository,
    private readonly service: ScheduledMessageService,
    private readonly chatId: bigint,
    private readonly fromId: bigint,
  ) {
    super();
  }

  protected async _call(arg: string): Promise<string> {
    const commaIndex = arg.indexOf(',');
    if (commaIndex < 0) {
      return 'Error: Invalid input. Input should be a comma separated list of "integer amount of seconds in the future","message text".';
    }

    const firstArgument = arg.slice(0, commaIndex);
    if (!NUMERIC_REGEXP.test(firstArgument)) {
      return 'Error: Invalid input. Input should be a comma separated list of "integer amount of seconds in the future","message text". First value must be a positive integer. Use the "date-time" tool if you need to get the current time for calculation purposes.';
    }
    const seconds = parseInt(firstArgument);

    const message = arg.slice(commaIndex + 1).trim();

    const date = new Date();
    date.setSeconds(date.getSeconds() + seconds);
    try {
      const scheduledMessage = await this.repository.create(
        date,
        message,
        this.chatId,
        this.fromId,
      );
      setTimeout(
        this.service.send.bind(
          this.service,
          message,
          scheduledMessage.id,
          this.chatId,
        ),
        seconds * MILLISECONDS_IN_SECOND,
      );
    } catch (e) {
      ErrorService.log(e);
      return 'Error: Failed scheduling the message.';
    }

    const dateTime = date.toLocaleString('de-CH', {
      timeZone: 'Europe/Zurich',
    });
    return `Successfully scheduled message for ${dateTime} CET.`;
  }
}
