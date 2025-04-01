/** Error thrown when a card number is not a valid integer */
export class PokemonTcgPocketInvalidCardNumberError extends Error {
  constructor(setKey: string, cardNumber: string) {
    super(`Invalid card number ${cardNumber} in set ${setKey}`);
    this.name = 'PokemonTcgPocketInvalidCardNumberError';
  }
}
