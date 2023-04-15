import TelegramBot from 'node-telegram-bot-api';
import { injectable } from 'inversify';
import assert from 'assert';
import { AllowlistedReplyStrategy } from '../AllowlistedReplyStrategy';
import { CommandService } from '../CommandService';
import { Config } from '../Config';
import { Command, Commands } from '../Command';
import { TelegramService } from '../TelegramService';

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

  willHandleAllowlisted(message: TelegramBot.Message): boolean {
    return message.text !== undefined && COMMAND_NAME.test(message.text);
  }

  async handle(message: TelegramBot.Message): Promise<void> {
    assert(message.text !== undefined);

    const commandMatches = message.text.match(COMMAND_NAME);
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
