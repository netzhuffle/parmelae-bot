import { Command, Commands } from './Command';
import { ReplyGenerator } from './MessageGenerators/ReplyGenerator';
import { NotExhaustiveSwitchError } from './NotExhaustiveSwitchError';
import { injectable } from 'inversify';
import { MessageWithReplyTo } from './Repositories/Types';

/** Executes a command */
@injectable()
export class CommandService {
  constructor(private readonly replyGenerator: ReplyGenerator) {}

  /**
   * Executes a command
   *
   * @param command - The command
   * @param message - The message to reply to
   */
  async execute(
    command: Command,
    message: MessageWithReplyTo,
  ): Promise<string> {
    if (command === Commands.Unknown) {
      return 'Dieses Kommando ist unbekannt. Ich weiss nicht, was ich tun soll.';
    }
    if (command === Commands.Info) {
      return 'Sie können mich nach dem aktuellen Status von Minecraft fragen oder mich bitten, Skycreate zu starten, zu stoppen oder zu backuppen.';
    }
    if (command === Commands.Comment) {
      if (!message.replyToMessage) {
        return 'Ich würde Ihnen gerne einen Kommentar dazu abgeben, aber dazu müssen Sie mich in einer Antwort auf einen Text fragen, s’il vous plait.';
      }

      return this.replyGenerator.generate(message.replyToMessage);
    }

    throw new NotExhaustiveSwitchError(command);
  }
}
