import { PokemonTcgPocketError } from './PokemonTcgPocketError.js';

/** Error thrown when a required entity is not found */
export class PokemonTcgPocketNotFoundError extends PokemonTcgPocketError {
  constructor(entityType: string, identifier: string) {
    super(`${entityType} ${identifier} not found`);
    this.name = 'PokemonTcgPocketNotFoundError';
  }
}
