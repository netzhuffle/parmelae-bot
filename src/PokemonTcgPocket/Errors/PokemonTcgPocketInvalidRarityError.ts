import { PokemonTcgPocketError } from './PokemonTcgPocketError.js';

/** Error thrown when a rarity symbol is invalid */
export class PokemonTcgPocketInvalidRarityError extends PokemonTcgPocketError {
  constructor(symbol: string) {
    super(`Invalid rarity symbol: ${symbol}`);
    this.name = 'PokemonTcgPocketInvalidRarityError';
  }
}
