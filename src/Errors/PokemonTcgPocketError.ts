/** Base error class for Pokemon TCG Pocket operations */
export class PokemonTcgPocketError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PokemonTcgPocketError';
  }
}
