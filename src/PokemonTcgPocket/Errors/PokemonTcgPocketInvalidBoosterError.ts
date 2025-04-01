/** Error thrown when a card references non-existent boosters */
export class PokemonTcgPocketInvalidBoosterError extends Error {
  constructor(cardName: string, boosterNames: string) {
    super(`Card ${cardName} references non-existent boosters: ${boosterNames}`);
    this.name = 'PokemonTcgPocketInvalidBoosterError';
  }
}
