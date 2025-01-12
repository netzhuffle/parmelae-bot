/** Error thrown when a card references a non-existent booster */
export class PokemonTcgPocketInvalidBoosterError extends Error {
  constructor(cardName: string) {
    super(`Card ${cardName} references non-existent boosters`);
    this.name = 'PokemonTcgPocketInvalidBoosterError';
  }
}
