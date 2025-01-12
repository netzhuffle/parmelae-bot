/** Error thrown when a duplicate card number is found in a set */
export class PokemonTcgPocketDuplicateCardNumberError extends Error {
  constructor(setKey: string, cardNumber: string) {
    super(`Duplicate card number ${cardNumber} in set ${setKey}`);
    this.name = 'PokemonTcgPocketDuplicateCardNumberError';
  }
}
