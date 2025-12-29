import { injectable } from 'inversify';
import { AllowlistedReplyStrategy } from '../AllowlistedReplyStrategy.js';
import { CommandService } from '../CommandService.js';
import { Config } from '../Config.js';
import { Commands } from '../Command.js';
import { TelegramService } from '../TelegramService.js';
import { TelegramMessageWithReplyTo } from '../Repositories/Types.js';
import { MessageModel } from '../generated/prisma/models/Message.js';

/**
 * Comments a message (/comment command) when somebody replies with (just) the bot’s name.
 */
@injectable()
export class CommentReplyStrategy extends AllowlistedReplyStrategy {
  private readonly onlyUsernameRegExp: RegExp;

  constructor(
    private readonly command: CommandService,
    config: Config,
    private readonly telegram: TelegramService,
  ) {
    super(config);
    this.onlyUsernameRegExp = new RegExp(
      `^\\w*@${this.config.primaryBot.username}\\w*$`,
      'is',
    );
  }

  willHandleAllowlisted(message: MessageModel): boolean {
    return (
      message.imageFileId === null && this.onlyUsernameRegExp.test(message.text)
    );
  }

  async handle(message: TelegramMessageWithReplyTo): Promise<void> {
    void this.telegram.sendTyping(message.chatId);
    const reply = await this.command.execute(Commands.Comment, message);
    await this.telegram.reply(reply, message);
  }
}
