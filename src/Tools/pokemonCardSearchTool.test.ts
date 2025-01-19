import { PokemonTcgPocketService } from '../PokemonTcgPocketService.js';
import { PokemonTcgPocketRepositoryFake } from '../Fakes/PokemonTcgPocketRepositoryFake.js';
import { Rarity } from '@prisma/client';
import { PokemonTcgPocketRepository } from '../Repositories/PokemonTcgPocketRepository.js';
import { getContextVariable } from '@langchain/core/context';
import { jest } from '@jest/globals';
import {
  pokemonCardSearchTool,
  OwnershipFilter,
} from './pokemonCardSearchTool.js';
import { AssertionError } from 'assert';

jest.mock('@langchain/core/context');

describe('pokemonCardSearch', () => {
  let repository: PokemonTcgPocketRepositoryFake;
  let service: PokemonTcgPocketService;

  beforeEach(() => {
    repository = new PokemonTcgPocketRepositoryFake();
    service = new PokemonTcgPocketService(
      repository as unknown as PokemonTcgPocketRepository,
      '',
    );
    jest
      .mocked(getContextVariable)
      .mockImplementation(<T>(name: PropertyKey): T | undefined => {
        if (name === 'pokemonTcgPocket') return service as T;
        if (name === 'userId') return BigInt(1) as T;
        return undefined;
      });
    jest.spyOn(repository, 'searchCards');
  });

  afterEach(() => {
    repository.clear();
    jest.clearAllMocks();
  });

  it('should format results as CSV with all columns', async () => {
    await repository.createSet('A1', 'Test Set');
    await repository.createBooster('Test Booster', 'A1');
    await repository.createCard('Test Card', 'A1', 1, Rarity.ONE_DIAMOND, [
      'Test Booster',
    ]);

    const result = (await pokemonCardSearchTool.invoke({})) as string;

    expect(result).toBe(
      'ID,Name,Rarity,Set,Boosters,Owned by @test1\nA1-001,Test Card,♢,Test Set,Test Booster,No',
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
    await repository.createSet('A1', 'Test Set');
    // Create 25 cards
    for (let i = 1; i <= 25; i++) {
      await repository.createCard(`Card ${i}`, 'A1', i, Rarity.ONE_DIAMOND, []);
    }

    const result = (await pokemonCardSearchTool.invoke({})) as string;

    const lines = result.split('\n');
    // Header + 20 cards + empty line + message
    expect(lines).toHaveLength(23);
    expect(lines[0]).toBe('ID,Name,Rarity,Set,Boosters,Owned by @test1');
    expect(lines[lines.length - 1]).toBe(
      'Limited list above to first 20 cards to save token usage. Tell the user there are 5 additional cards matching the search query (25 total).',
    );
    // Verify we got exactly 20 cards
    const cardLines = lines.slice(1, -2); // Remove header and message
    expect(cardLines).toHaveLength(20);
    // Verify ownership column exists and is set to No
    expect(cardLines[0].endsWith(',No')).toBe(true);
    expect(repository.searchCards).toHaveBeenCalledWith({});
  });

  it('should filter by card name', async () => {
    await repository.createSet('A1', 'Test Set');
    await repository.createCard('Card 1', 'A1', 1, Rarity.ONE_DIAMOND, []);

    const result = (await pokemonCardSearchTool.invoke({
      cardName: 'Card',
    })) as string;

    expect(result).toContain('Card 1');
    expect(result).toContain(',No'); // Verify ownership column
    expect(repository.searchCards).toHaveBeenCalledWith({
      cardName: 'Card',
    });
  });

  it('should filter by set name', async () => {
    await repository.createSet('A1', 'Test Set');
    await repository.createCard('Card 1', 'A1', 1, Rarity.ONE_DIAMOND, []);

    const result = (await pokemonCardSearchTool.invoke({
      setName: 'Test Set',
    })) as string;

    expect(result).toContain('Card 1');
    expect(result).toContain('Test Set');
    expect(result).toContain(',No'); // Verify ownership column
    expect(repository.searchCards).toHaveBeenCalledWith({
      setName: 'Test Set',
    });
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
    expect(result).toContain(',No'); // Verify ownership column
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
    expect(result).toContain(',No'); // Verify ownership column
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
    expect(result).toContain(',No'); // Verify ownership column
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

    expect(result).toContain('Card 1');
    // Find the line with Card 1 and verify it doesn't contain any booster
    const cardLine = result
      .split('\n')
      .find((line) => line.includes('Card 1'))!;
    const columns = cardLine.split(',');
    expect(columns[4]).toBe(''); // Boosters column should be empty
    expect(columns[5]).toBe('No'); // Ownership column should be No
    expect(repository.searchCards).toHaveBeenCalledWith({});
  });

  it('should handle cards without rarity', async () => {
    await repository.createSet('A1', 'Test Set');
    await repository.createCard('Card 1', 'A1', 1, null, []);

    const result = (await pokemonCardSearchTool.invoke({})) as string;

    expect(result).toContain('Card 1');
    // Find the line with Card 1 and verify it has empty rarity
    const cardLine = result
      .split('\n')
      .find((line) => line.includes('Card 1'))!;
    const columns = cardLine.split(',');
    expect(columns[2]).toBe(''); // Rarity column should be empty
    expect(columns[5]).toBe('No'); // Ownership column should be No
    expect(repository.searchCards).toHaveBeenCalledWith({});
  });

  describe('ownership filtering', () => {
    beforeEach(async () => {
      await repository.createSet('A1', 'Test Set');
      await repository.createCard('Card 1', 'A1', 1, Rarity.ONE_DIAMOND, []);
      await repository.createCard('Card 2', 'A1', 2, Rarity.TWO_DIAMONDS, []);
      await repository.createCard('Card 3', 'A1', 3, Rarity.THREE_DIAMONDS, []);
    });

    it('should return all cards when ownership filter is not set', async () => {
      const result = (await pokemonCardSearchTool.invoke({})) as string;

      expect(result).toContain('Card 1');
      expect(result).toContain('Card 2');
      expect(result).toContain('Card 3');
      // Verify all cards show as not owned
      const lines = result.split('\n').slice(1); // Skip header
      lines.forEach((line) => {
        expect(line.endsWith(',No')).toBe(true);
      });
      expect(repository.searchCards).toHaveBeenCalledWith({});
    });

    it('should pass ownership filter when set to owned', async () => {
      await repository.createSet('A1', 'Test Set');
      const card1 = await repository.createCard(
        'Card 1',
        'A1',
        1,
        Rarity.ONE_DIAMOND,
        [],
      );
      const card2 = await repository.createCard(
        'Card 2',
        'A1',
        2,
        Rarity.ONE_DIAMOND,
        [],
      );
      const card3 = await repository.createCard(
        'Card 3',
        'A1',
        3,
        Rarity.ONE_DIAMOND,
        [],
      );
      await repository.addCardToCollection(card1.id, BigInt(1));
      await repository.addCardToCollection(card2.id, BigInt(1));
      await repository.addCardToCollection(card3.id, BigInt(1));

      const result = (await pokemonCardSearchTool.invoke({
        ownershipFilter: OwnershipFilter.OWNED,
      })) as string;

      expect(result).toContain('Card 1');
      expect(result).toContain('Card 2');
      expect(result).toContain('Card 3');
      // Verify all cards show as owned since we're filtering for owned cards
      const lines = result.split('\n').slice(1); // Skip header
      lines.forEach((line) => {
        expect(line.endsWith(',Yes')).toBe(true);
      });
      expect(repository.searchCards).toHaveBeenCalledWith({
        userId: BigInt(1),
        ownershipFilter: OwnershipFilter.OWNED,
      });
    });

    it('should pass ownership filter when set to missing', async () => {
      const result = (await pokemonCardSearchTool.invoke({
        ownershipFilter: OwnershipFilter.MISSING,
      })) as string;

      expect(result).toContain('Card 1');
      expect(result).toContain('Card 2');
      expect(result).toContain('Card 3');
      // Verify all cards show as not owned since we're filtering for missing cards
      const lines = result.split('\n').slice(1); // Skip header
      lines.forEach((line) => {
        expect(line.endsWith(',No')).toBe(true);
      });
      expect(repository.searchCards).toHaveBeenCalledWith({
        userId: BigInt(1),
        ownershipFilter: OwnershipFilter.MISSING,
      });
    });

    it('should pass ownership filter when set to all', async () => {
      const result = (await pokemonCardSearchTool.invoke({
        ownershipFilter: OwnershipFilter.ALL,
      })) as string;

      expect(result).toContain('Card 1');
      expect(result).toContain('Card 2');
      expect(result).toContain('Card 3');
      // Verify all cards show as not owned since we're using a fake repository
      const lines = result.split('\n').slice(1); // Skip header
      lines.forEach((line) => {
        expect(line.endsWith(',No')).toBe(true);
      });
      expect(repository.searchCards).toHaveBeenCalledWith({
        userId: BigInt(1),
        ownershipFilter: OwnershipFilter.ALL,
      });
    });

    it('should throw error when userId not available', async () => {
      jest.mocked(getContextVariable).mockReturnValue(undefined);

      await expect(
        pokemonCardSearchTool.invoke({
          ownershipFilter: OwnershipFilter.OWNED,
        }),
      ).rejects.toThrow(AssertionError);
    });
  });

  describe('ownership display', () => {
    beforeEach(async () => {
      await repository.createSet('A1', 'Test Set');
      await repository.createCard('Test Card', 'A1', 1, Rarity.ONE_DIAMOND, []);
    });

    it('should show ownership by username when available', async () => {
      jest
        .mocked(getContextVariable)
        .mockImplementation(<T>(name: PropertyKey): T | undefined => {
          if (name === 'pokemonTcgPocket') return service as T;
          if (name === 'userId') return BigInt(1) as T;
          return undefined;
        });

      const result = (await pokemonCardSearchTool.invoke({})) as string;

      expect(result).toContain('Owned by @test1');
    });

    it('should show ownership by first name when username not available', async () => {
      jest
        .mocked(getContextVariable)
        .mockImplementation(<T>(name: PropertyKey): T | undefined => {
          if (name === 'pokemonTcgPocket') return service as T;
          if (name === 'userId') return BigInt(2) as T;
          return undefined;
        });

      const result = (await pokemonCardSearchTool.invoke({})) as string;

      expect(result).toContain('Owned by Test2');
    });
  });
});
