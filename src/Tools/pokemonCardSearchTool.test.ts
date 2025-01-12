import { PokemonTcgPocketService } from '../PokemonTcgPocketService.js';
import { PokemonTcgPocketRepositoryFake } from '../Fakes/PokemonTcgPocketRepositoryFake.js';
import { Rarity } from '@prisma/client';
import { PokemonTcgPocketRepository } from '../Repositories/PokemonTcgPocketRepository.js';
import { getContextVariable } from '@langchain/core/context';
import { jest } from '@jest/globals';
import { pokemonCardSearchTool } from './pokemonCardSearchTool.js';

jest.mock('@langchain/core/context');

describe('pokemonCardSearch', () => {
  let repository: PokemonTcgPocketRepositoryFake;
  let service: PokemonTcgPocketService;

  beforeEach(() => {
    repository = new PokemonTcgPocketRepositoryFake();
    service = new PokemonTcgPocketService(
      repository as PokemonTcgPocketRepository,
      '',
    );
    jest
      .mocked(getContextVariable)
      .mockImplementation(<T>(name: PropertyKey): T | undefined => {
        if (name === 'pokemonTcgPocket') return service as T;
        return undefined;
      });
    jest.spyOn(repository, 'searchCards');
  });

  afterEach(() => {
    repository.clear();
    jest.clearAllMocks();
  });

  it('should format results as CSV', async () => {
    await repository.createSet('A1', 'Test Set');
    await repository.createBooster('Test Booster', 'A1');
    await repository.createCard('Test Card', 'A1', 1, Rarity.ONE_DIAMOND, [
      'Test Booster',
    ]);

    const result = (await pokemonCardSearchTool.invoke({})) as string;

    expect(result).toBe(
      'ID,Name,Rarity,Set,Boosters\nA1-001,Test Card,♢,Test Set,Test Booster',
    );
    expect(repository.searchCards).toHaveBeenCalledWith({});
  });

  it('should handle empty results', async () => {
    const result = (await pokemonCardSearchTool.invoke({})) as string;

    expect(result).toBe('No cards found matching the search criteria.');
    expect(repository.searchCards).toHaveBeenCalledWith({});
  });

  it('should return no cards found message when using filters', async () => {
    const result = (await pokemonCardSearchTool.invoke({
      cardName: 'NonexistentCard',
    })) as string;

    expect(result).toBe('No cards found matching the search criteria.');
    expect(repository.searchCards).toHaveBeenCalledWith({
      cardName: 'NonexistentCard',
    });
  });

  it('should limit results to 20 cards and show message', async () => {
    // Create 25 cards
    await repository.createSet('A1', 'Test Set');
    for (let i = 1; i <= 25; i++) {
      await repository.createCard(`Card ${i}`, 'A1', i, Rarity.ONE_DIAMOND, []);
    }

    const result = (await pokemonCardSearchTool.invoke({})) as string;

    const lines = result.split('\n');
    expect(lines).toHaveLength(23); // Header + 20 cards + empty line + message
    expect(lines[0]).toBe('ID,Name,Rarity,Set,Boosters');
    expect(lines[lines.length - 1]).toBe(
      'There are more cards matching the search query, limited to first 20 cards.',
    );
    expect(repository.searchCards).toHaveBeenCalledWith({});
  });

  it('should filter by card name substring', async () => {
    await repository.createSet('A1', 'Test Set');
    await repository.createCard('Pikachu', 'A1', 1, Rarity.ONE_DIAMOND, []);
    await repository.createCard('Raichu', 'A1', 2, Rarity.TWO_DIAMONDS, []);

    const result = (await pokemonCardSearchTool.invoke({
      cardName: 'chu',
    })) as string;

    expect(result).toContain('Pikachu');
    expect(result).toContain('Raichu');
    expect(repository.searchCards).toHaveBeenCalledWith({ cardName: 'chu' });
  });

  it('should filter by set name', async () => {
    await repository.createSet('A1', 'Set One');
    await repository.createCard('Card 1', 'A1', 1, Rarity.ONE_DIAMOND, []);

    const result = (await pokemonCardSearchTool.invoke({
      setName: 'Set One',
    })) as string;

    expect(result).toContain('Card 1');
    expect(result).toContain('Set One');
    expect(repository.searchCards).toHaveBeenCalledWith({ setName: 'Set One' });
  });

  it('should filter by booster', async () => {
    await repository.createSet('A1', 'Test Set');
    await repository.createBooster('Booster 1', 'A1');
    await repository.createCard('Card 1', 'A1', 1, Rarity.ONE_DIAMOND, [
      'Booster 1',
    ]);

    const result = (await pokemonCardSearchTool.invoke({
      booster: 'Booster 1',
    })) as string;

    expect(result).toContain('Card 1');
    expect(result).toContain('Booster 1');
    expect(repository.searchCards).toHaveBeenCalledWith({
      booster: 'Booster 1',
    });
  });

  it('should filter by rarity', async () => {
    await repository.createSet('A1', 'Test Set');
    await repository.createCard('Card 1', 'A1', 1, Rarity.ONE_DIAMOND, []);

    const result = (await pokemonCardSearchTool.invoke({
      rarity: '♢',
    })) as string;

    expect(result).toContain('Card 1');
    expect(result).toContain('♢');
    expect(repository.searchCards).toHaveBeenCalledWith({
      rarity: Rarity.ONE_DIAMOND,
    });
  });

  it('should parse and filter by card ID', async () => {
    await repository.createSet('A1', 'Test Set');
    await repository.createCard('Card 1', 'A1', 1, Rarity.ONE_DIAMOND, []);

    const result = (await pokemonCardSearchTool.invoke({
      cardId: 'A1-001',
    })) as string;

    expect(result).toContain('Card 1');
    expect(result).toContain('A1-001');
    expect(repository.searchCards).toHaveBeenCalledWith({
      setKey: 'A1',
      cardNumber: 1,
    });
  });

  it('should return error message for invalid card ID format', async () => {
    const result = (await pokemonCardSearchTool.invoke({
      cardId: 'invalid',
    })) as string;

    expect(result).toBe(
      'Invalid card ID format. Expected format: {set-key}-{three digit number}, e.g. A1-003',
    );
    expect(repository.searchCards).not.toHaveBeenCalled();
  });

  it('should handle cards without boosters', async () => {
    await repository.createSet('A1', 'Test Set');
    await repository.createCard('Card 1', 'A1', 1, Rarity.ONE_DIAMOND, []);

    const result = (await pokemonCardSearchTool.invoke({})) as string;

    expect(result).toBe(
      'ID,Name,Rarity,Set,Boosters\nA1-001,Card 1,♢,Test Set,',
    );
    expect(repository.searchCards).toHaveBeenCalledWith({});
  });

  it('should handle cards without rarity', async () => {
    await repository.createSet('A1', 'Test Set');
    await repository.createCard('Card 1', 'A1', 1, null, []);

    const result = (await pokemonCardSearchTool.invoke({})) as string;

    expect(result).toBe(
      'ID,Name,Rarity,Set,Boosters\nA1-001,Card 1,,Test Set,',
    );
    expect(repository.searchCards).toHaveBeenCalledWith({});
  });
});
