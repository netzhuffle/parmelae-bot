import { injectable } from 'inversify';
import assert from 'assert';
import { AllowlistedReplyStrategy } from '../AllowlistedReplyStrategy.js';
import { CommandService } from '../CommandService.js';
import { Config } from '../Config.js';
import { Command, Commands } from '../Command.js';
import { TelegramService } from '../TelegramService.js';
import { Message } from '@prisma/client';
import { TelegramMessageWithReplyTo } from '../Repositories/Types.js';

/** Regex matching the command name. */
const COMMAND_NAME = /^\/(.*)@/;

/** Executes commands written as /xyz@BotName in allowlisted chats. */
@injectable()
export class CommandReplyStrategy extends AllowlistedReplyStrategy {
  constructor(
    private readonly command: CommandService,
    config: Config,
    private readonly telegram: TelegramService,
  ) {
    super(config);
  }

  willHandleAllowlisted(message: Message): boolean {
    return COMMAND_NAME.test(message.text);
  }

  async handle(message: TelegramMessageWithReplyTo): Promise<void> {
    const commandMatches = COMMAND_NAME.exec(message.text);
    assert(commandMatches && commandMatches.length >= 2);
    const command = this.getCommand(commandMatches[1]);

    const reply = await this.command.execute(command, message);
    return this.telegram.reply(reply, message);
  }

  private getCommand(command: string): Command {
    switch (command) {
      case 'info':
        return Commands.Info;
      case 'comment':
        return Commands.Comment;
      default:
        return Commands.Unknown;
    }
  }
}
