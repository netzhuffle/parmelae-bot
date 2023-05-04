import { Tool } from 'langchain/tools';
import { TelegramService } from '../TelegramService';

export class DiceTool extends Tool {
  name = 'dice';

  description =
    'Throw a die in the telegram chat. Will be displayed as an emoji with a random value to users. This tools returns your random value. Input is the emoji on which the animation is based: "🎲" (default), "🎯", "🎳", "🏀", "⚽", or "🎰".';

  constructor(
    private readonly telegram: TelegramService,
    private readonly chatId: bigint,
  ) {
    super();
  }

  protected async _call(arg: string): Promise<string> {
    if (!['🎲', '🎯', '🏀', '⚽', '🎳', '🎰'].includes(arg)) {
      return 'Error: Input must be one of "🎲", "🎯", "🏀", "⚽", "🎳", "🎰"';
    }
    const result = await this.telegram.sendDice(arg, this.chatId);
    const dice = result.dice;
    if (!dice) {
      return 'Error: Telegram could not determine a random result';
    }

    if (arg === '🎲') {
      return `Your six sided die rolled a ${dice.value}.`;
    }
    if (arg === '🎰') {
      return dice.value !== 64
        ? 'Game 🎰: you lost (reels did not stop at 777)'
        : 'Game 🎰: you won! (Reels stopped at 777)';
    }
    const max = ['🎯', '🎳'].includes(arg) ? 6 : 5;
    return `Game ${arg}: You scored ${dice.value} out of max. ${max} points`;
  }
}
