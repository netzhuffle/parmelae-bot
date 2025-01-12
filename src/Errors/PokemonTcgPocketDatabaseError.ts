import { PokemonTcgPocketError } from './PokemonTcgPocketError.js';

/** Error thrown when a database operation fails */
export class PokemonTcgPocketDatabaseError extends PokemonTcgPocketError {
  constructor(operation: string, entity: string, details: Error | string) {
    super(`Failed to ${operation} ${entity}: ${details}`);
    this.name = 'PokemonTcgPocketDatabaseError';
  }
}
