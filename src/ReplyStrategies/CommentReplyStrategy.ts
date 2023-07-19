import { injectable } from 'inversify';
import { AllowlistedReplyStrategy } from '../AllowlistedReplyStrategy';
import { CommandService } from '../CommandService';
import { Config } from '../Config';
import { Commands } from '../Command';
import { TelegramService } from '../TelegramService';
import { MessageWithReplyTo } from '../Repositories/Types';
import { Message } from '@prisma/client';

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
      `^\\w*@${this.config.username}\\w*$`,
      'is',
    );
  }

  willHandleAllowlisted(message: Message): boolean {
    return this.onlyUsernameRegExp.test(message.text);
  }

  async handle(message: MessageWithReplyTo): Promise<void> {
    void this.telegram.sendTyping(message.chatId);
    const reply = await this.command.execute(Commands.Comment, message);
    return this.telegram.reply(reply, message);
  }
}
