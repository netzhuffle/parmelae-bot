import { injectable } from 'inversify';

import { Command, Commands } from './Command.js';
import { ReplyGenerator } from './MessageGenerators/ReplyGenerator.js';
import { NotExhaustiveSwitchError } from './NotExhaustiveSwitchError.js';
import { TelegramMessageWithReplyTo } from './Repositories/Types.js';
import { StreamingTextSink } from './StreamingTextSink.js';

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
    message: TelegramMessageWithReplyTo,
    streamSink?: StreamingTextSink,
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
      const toolCalls: string[] = [];
      const response = await this.replyGenerator.generate(
        message.replyToMessage,
        async (text) => {
          toolCalls.push(text);
          if (streamSink) {
            await streamSink.appendText(text + '\n');
          }
          return null;
        },
        streamSink,
      );
      return (toolCalls.length ? toolCalls.join('\n') + '\n' : '') + response.text;
    }

    throw new NotExhaustiveSwitchError(command);
  }
}
