import { describe, beforeEach, it, spyOn, afterEach, expect } from 'bun:test';
import { PokemonTcgPocketService } from '../PokemonTcgPocket/PokemonTcgPocketService.js';
import { PokemonTcgPocketRepositoryFake } from '../PokemonTcgPocket/Fakes/PokemonTcgPocketRepositoryFake.js';
import { Rarity, OwnershipStatus } from '@prisma/client';
import { PokemonTcgPocketRepository } from '../PokemonTcgPocket/Repositories/PokemonTcgPocketRepository.js';
import { pokemonCardSearchTool } from './pokemonCardSearchTool.js';
import { ToolContext } from '../ChatGptAgentService.js';
import { createTestToolConfig } from '../ChatGptAgentService.js';
import { PokemonTcgPocketProbabilityService } from '../PokemonTcgPocket/PokemonTcgPocketProbabilityService.js';

describe('pokemonCardSearch', () => {
  let repository: PokemonTcgPocketRepositoryFake;
  let config: { configurable: ToolContext };
  beforeEach(() => {
    repository = new PokemonTcgPocketRepositoryFake();
    const probabilityService = new PokemonTcgPocketProbabilityService();
    const service = new PokemonTcgPocketService(
      probabilityService,
      repository as unknown as PokemonTcgPocketRepository,
      '',
    );
    config = createTestToolConfig({
      userId: BigInt(1),
      pokemonTcgPocketService: service,
    });
    spyOn(repository, 'searchCards');
  });

  afterEach(() => {
    repository.clear();
  });

  it('should format results as CSV with all columns', async () => {
    await repository.createSet('A1', 'Test Set');
    await repository.createBooster('Glurak', 'A1');
    await repository.createCard({
      name: 'Test Card',
      setKey: 'A1',
      number: 1,
      rarity: Rarity.ONE_DIAMOND,
      boosterNames: ['Glurak'],
      isSixPackOnly: false,
    });

    const result = await pokemonCardSearchTool.invoke(
      {
        card: null,
        setKey: null,
        booster: null,
        rarity: null,
        ownershipFilter: null,
      },
      config,
    );

    expect(result).toBe(
      'ID,Name,Rarity,Set,Boosters,Owned by @test1\nA1-001,Test Card,♢,Test Set,Glurak,No',
    );
    expect(repository.searchCards).toHaveBeenCalledWith({});
  });

  it('should handle empty results', async () => {
    const result = await pokemonCardSearchTool.invoke(
      {
        card: null,
        setKey: null,
        booster: null,
        rarity: null,
        ownershipFilter: null,
      },
      config,
    );

    expect(result).toBe('No cards found matching the search criteria.');
    expect(repository.searchCards).toHaveBeenCalledWith({});
  });

  it('should return no cards found message when using filters', async () => {
    const result = await pokemonCardSearchTool.invoke(
      {
        card: 'NonexistentCard',
        setKey: null,
        booster: null,
        rarity: null,
        ownershipFilter: null,
      },
      config,
    );

    expect(result).toBe('No cards found matching the search criteria.');
    expect(repository.searchCards).toHaveBeenCalledWith({
      cardName: 'NonexistentCard',
    });
  });

  it('should limit results to 20 cards and show message', async () => {
    await repository.createSet('A1', 'Test Set');
    // Create 25 cards
    for (let i = 1; i <= 25; i++) {
      await repository.createCard({
        name: `Card ${i}`,
        setKey: 'A1',
        number: i,
        rarity: Rarity.ONE_DIAMOND,
        boosterNames: [],
        isSixPackOnly: false,
      });
    }

    const result = await pokemonCardSearchTool.invoke(
      {
        card: null,
        setKey: null,
        booster: null,
        rarity: null,
        ownershipFilter: null,
      },
      config,
    );

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
    await repository.createCard({
      name: 'Card 1',
      setKey: 'A1',
      number: 1,
      rarity: Rarity.ONE_DIAMOND,
      boosterNames: [],
      isSixPackOnly: false,
    });

    const result = await pokemonCardSearchTool.invoke(
      {
        card: 'Card',
        setKey: null,
        booster: null,
        rarity: null,
        ownershipFilter: null,
      },
      config,
    );

    expect(result).toContain('Card 1');
    expect(result).toContain(',No'); // Verify ownership column
    expect(repository.searchCards).toHaveBeenCalledWith({
      cardName: 'Card',
    });
  });

  it('should filter by set key', async () => {
    await repository.createSet('A1', 'Test Set');
    await repository.createCard({
      name: 'Card 1',
      setKey: 'A1',
      number: 1,
      rarity: Rarity.ONE_DIAMOND,
      boosterNames: [],
      isSixPackOnly: false,
    });

    const result = await pokemonCardSearchTool.invoke(
      {
        card: null,
        setKey: 'A1',
        booster: null,
        rarity: null,
        ownershipFilter: null,
      },
      config,
    );

    expect(result).toContain('Card 1');
    expect(result).toContain('Test Set');
    expect(result).toContain(',No'); // Verify ownership column
    expect(repository.searchCards).toHaveBeenCalledWith({
      setKey: 'A1',
    });
  });

  it('should filter by booster', async () => {
    await repository.createSet('A1', 'Test Set');
    await repository.createBooster('Glurak', 'A1');
    await repository.createCard({
      name: 'Card 1',
      setKey: 'A1',
      number: 1,
      rarity: Rarity.ONE_DIAMOND,
      boosterNames: ['Glurak'],
      isSixPackOnly: false,
    });

    const result = await pokemonCardSearchTool.invoke(
      {
        card: null,
        setKey: null,
        booster: 'Glurak',
        rarity: null,
        ownershipFilter: null,
      },
      config,
    );

    expect(result).toContain('Card 1');
    expect(result).toContain('Glurak');
    expect(result).toContain(',No'); // Verify ownership column
    expect(repository.searchCards).toHaveBeenCalledWith({
      booster: 'Glurak',
    });
  });

  it('should filter by rarity', async () => {
    await repository.createSet('A1', 'Test Set');
    await repository.createCard({
      name: 'Card 1',
      setKey: 'A1',
      number: 1,
      rarity: Rarity.ONE_DIAMOND,
      boosterNames: [],
      isSixPackOnly: false,
    });

    const result = await pokemonCardSearchTool.invoke(
      {
        card: null,
        setKey: null,
        booster: null,
        rarity: '♢',
        ownershipFilter: null,
      },
      config,
    );

    expect(result).toContain('Card 1');
    expect(result).toContain('♢');
    expect(result).toContain(',No'); // Verify ownership column
    expect(repository.searchCards).toHaveBeenCalledWith({
      rarity: Rarity.ONE_DIAMOND,
    });
  });

  it('should parse and filter by card ID', async () => {
    await repository.createSet('A1', 'Test Set');
    await repository.createCard({
      name: 'Card 1',
      setKey: 'A1',
      number: 1,
      rarity: Rarity.ONE_DIAMOND,
      boosterNames: [],
      isSixPackOnly: false,
    });

    const result = await pokemonCardSearchTool.invoke(
      {
        card: 'A1-001',
        setKey: null,
        booster: null,
        rarity: null,
        ownershipFilter: null,
      },
      config,
    );

    expect(result).toContain('Card 1');
    expect(result).toContain('A1-001');
    expect(result).toContain(',No'); // Verify ownership column
    expect(repository.searchCards).toHaveBeenCalledWith({
      setKey: 'A1',
      cardNumber: 1,
    });
  });

  it('should handle cards without boosters', async () => {
    await repository.createSet('A1', 'Test Set');
    await repository.createCard({
      name: 'Card 1',
      setKey: 'A1',
      number: 1,
      rarity: Rarity.ONE_DIAMOND,
      boosterNames: [],
      isSixPackOnly: false,
    });

    const result = await pokemonCardSearchTool.invoke(
      {
        card: null,
        setKey: null,
        booster: null,
        rarity: null,
        ownershipFilter: null,
      },
      config,
    );

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
    await repository.createCard({
      name: 'Card 1',
      setKey: 'A1',
      number: 1,
      rarity: null,
      boosterNames: [],
      isSixPackOnly: false,
    });

    const result = await pokemonCardSearchTool.invoke(
      {
        card: null,
        setKey: null,
        booster: null,
        rarity: null,
        ownershipFilter: null,
      },
      config,
    );

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
      await repository.createCard({
        name: 'Card 1',
        setKey: 'A1',
        number: 1,
        rarity: Rarity.ONE_DIAMOND,
        boosterNames: [],
        isSixPackOnly: false,
      });
      await repository.createCard({
        name: 'Card 2',
        setKey: 'A1',
        number: 2,
        rarity: Rarity.TWO_DIAMONDS,
        boosterNames: [],
        isSixPackOnly: false,
      });
      await repository.createCard({
        name: 'Card 3',
        setKey: 'A1',
        number: 3,
        rarity: Rarity.THREE_DIAMONDS,
        boosterNames: [],
        isSixPackOnly: false,
      });
    });

    it('should return all cards when ownership filter is not set', async () => {
      const result = await pokemonCardSearchTool.invoke(
        {
          card: null,
          setKey: null,
          booster: null,
          rarity: null,
          ownershipFilter: null,
        },
        config,
      );

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
      const card1 = await repository.createCard({
        name: 'Card 1',
        setKey: 'A1',
        number: 1,
        rarity: Rarity.ONE_DIAMOND,
        boosterNames: [],
        isSixPackOnly: false,
      });
      const card2 = await repository.createCard({
        name: 'Card 2',
        setKey: 'A1',
        number: 2,
        rarity: Rarity.ONE_DIAMOND,
        boosterNames: [],
        isSixPackOnly: false,
      });
      const card3 = await repository.createCard({
        name: 'Card 3',
        setKey: 'A1',
        number: 3,
        rarity: Rarity.ONE_DIAMOND,
        boosterNames: [],
        isSixPackOnly: false,
      });
      await repository.addCardToCollection(card1.id, BigInt(1));
      await repository.addCardToCollection(card2.id, BigInt(1));
      await repository.addCardToCollection(card3.id, BigInt(1));

      const result = await pokemonCardSearchTool.invoke(
        {
          card: null,
          setKey: null,
          booster: null,
          rarity: null,
          ownershipFilter: 'owned',
        },
        config,
      );

      expect(result).toContain('Card 1');
      expect(result).toContain('Card 2');
      expect(result).toContain('Card 3');
      // Verify all cards show as owned since we're filtering for owned cards
      const lines = result.split('\n').slice(1); // Skip header
      lines.forEach((line) => {
        expect(line.endsWith(',Yes')).toBe(true);
      });

      // Verify that the ownership status is set correctly in the repository
      const cards = await repository.searchCards({
        userId: BigInt(1),
        ownershipFilter: 'owned',
      });
      expect(cards).toHaveLength(3);
      cards.forEach((card) => {
        expect(card.ownership).toHaveLength(1);
        expect(card.ownership[0].status).toBe(OwnershipStatus.OWNED);
        expect(card.ownership[0].userId).toBe(BigInt(1));
      });

      expect(repository.searchCards).toHaveBeenCalledWith({
        userId: BigInt(1),
        ownershipFilter: 'owned',
      });
    });

    it('should pass ownership filter when set to missing', async () => {
      const result = await pokemonCardSearchTool.invoke(
        {
          card: null,
          setKey: null,
          booster: null,
          rarity: null,
          ownershipFilter: 'missing',
        },
        config,
      );

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
        ownershipFilter: 'missing',
      });
    });

    it('should pass ownership filter when set to all', async () => {
      const result = await pokemonCardSearchTool.invoke(
        {
          card: null,
          setKey: null,
          booster: null,
          rarity: null,
          ownershipFilter: 'all',
        },
        config,
      );

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
        ownershipFilter: 'all',
      });
    });

    it('should pass ownership filter when set to not_needed', async () => {
      await repository.createSet('A1', 'Test Set');
      const card1 = await repository.createCard({
        name: 'Card 1',
        setKey: 'A1',
        number: 1,
        rarity: Rarity.ONE_DIAMOND,
        boosterNames: [],
        isSixPackOnly: false,
      });
      const card2 = await repository.createCard({
        name: 'Card 2',
        setKey: 'A1',
        number: 2,
        rarity: Rarity.ONE_DIAMOND,
        boosterNames: [],
        isSixPackOnly: false,
      });
      const card3 = await repository.createCard({
        name: 'Card 3',
        setKey: 'A1',
        number: 3,
        rarity: Rarity.ONE_DIAMOND,
        boosterNames: [],
        isSixPackOnly: false,
      });

      // Mark cards as not needed
      await repository.addCardToCollection(
        card1.id,
        BigInt(1),
        OwnershipStatus.NOT_NEEDED,
      );
      await repository.addCardToCollection(
        card2.id,
        BigInt(1),
        OwnershipStatus.NOT_NEEDED,
      );
      await repository.addCardToCollection(
        card3.id,
        BigInt(1),
        OwnershipStatus.NOT_NEEDED,
      );

      const result = await pokemonCardSearchTool.invoke(
        {
          card: null,
          setKey: null,
          booster: null,
          rarity: null,
          ownershipFilter: 'not_needed',
        },
        config,
      );

      expect(result).toContain('Card 1');
      expect(result).toContain('Card 2');
      expect(result).toContain('Card 3');
      // Verify all cards show as "No (marked as not needed)"
      const lines = result.split('\n').slice(1); // Skip header
      lines.forEach((line) => {
        expect(line.endsWith(',No (marked as not needed)')).toBe(true);
      });

      // Verify that the ownership status is set correctly in the repository
      const cards = await repository.searchCards({
        userId: BigInt(1),
        ownershipFilter: 'not_needed',
      });
      expect(cards).toHaveLength(3);
      cards.forEach((card) => {
        expect(card.ownership).toHaveLength(1);
        expect(card.ownership[0].status).toBe(OwnershipStatus.NOT_NEEDED);
        expect(card.ownership[0].userId).toBe(BigInt(1));
      });

      expect(repository.searchCards).toHaveBeenCalledWith({
        userId: BigInt(1),
        ownershipFilter: 'not_needed',
      });
    });
  });

  describe('ownership display', () => {
    beforeEach(async () => {
      await repository.createSet('A1', 'Test Set');
      await repository.createCard({
        name: 'Test Card',
        setKey: 'A1',
        number: 1,
        rarity: Rarity.ONE_DIAMOND,
        boosterNames: [],
        isSixPackOnly: false,
      });
    });

    it('should show ownership by username when available', async () => {
      const result = await pokemonCardSearchTool.invoke(
        {
          card: null,
          setKey: null,
          booster: null,
          rarity: null,
          ownershipFilter: null,
        },
        config,
      );

      expect(result).toContain('Owned by @test1');
    });

    it('should show ownership by first name when username not available', async () => {
      config.configurable.userId = BigInt(2);

      const result = await pokemonCardSearchTool.invoke(
        {
          card: null,
          setKey: null,
          booster: null,
          rarity: null,
          ownershipFilter: null,
        },
        config,
      );

      expect(result).toContain('Owned by Test2');
    });
  });

  it('should handle no matches', async () => {
    await repository.createSet('A1', 'Test Set');
    await repository.createCard({
      name: 'Card 1',
      setKey: 'A1',
      number: 1,
      rarity: Rarity.ONE_DIAMOND,
      boosterNames: [],
      isSixPackOnly: false,
    });

    const result = await pokemonCardSearchTool.invoke(
      {
        card: 'NonexistentCard',
        setKey: null,
        booster: null,
        rarity: null,
        ownershipFilter: null,
      },
      config,
    );

    expect(result).toBe('No cards found matching the search criteria.');
    expect(repository.searchCards).toHaveBeenCalledWith({
      cardName: 'NonexistentCard',
    });
  });

  it('should show card details when ID exists but additional criteria do not match', async () => {
    await repository.createSet('A1', 'Test Set');
    await repository.createIdOnlyCard(
      'Test Card',
      'A1',
      1,
      Rarity.ONE_DIAMOND,
      [],
    );
    spyOn(repository, 'searchCards');

    const result = await pokemonCardSearchTool.invoke(
      {
        card: 'A1-001',
        setKey: null,
        booster: null,
        rarity: '♢♢', // Wrong rarity
        ownershipFilter: null,
      },
      config,
    );

    expect(result).toContain(
      'Card with ID A1-001 exists but does not match the additional search criteria:',
    );
    expect(result).toContain('Test Card');
    expect(repository.searchCards).toHaveBeenCalledWith({
      setKey: 'A1',
      cardNumber: 1,
      rarity: Rarity.TWO_DIAMONDS,
    });
    expect(repository.searchCards).toHaveBeenCalledWith({
      setKey: 'A1',
      cardNumber: 1,
    });
  });

  it('should show card details when ID exists but multiple additional criteria do not match', async () => {
    await repository.createSet('A1', 'Test Set');
    await repository.createIdOnlyCard(
      'Test Card',
      'A1',
      1,
      Rarity.ONE_DIAMOND,
      [],
    );
    spyOn(repository, 'searchCards');

    const result = await pokemonCardSearchTool.invoke(
      {
        card: 'A1-001',
        setKey: null,
        booster: 'Glurak', // Wrong booster
        rarity: '♢♢', // Wrong rarity
        ownershipFilter: null,
      },
      config,
    );

    expect(result).toContain(
      'Card with ID A1-001 exists but does not match the additional search criteria:',
    );
    expect(result).toContain('Test Card');
    expect(repository.searchCards).toHaveBeenCalledWith({
      setKey: 'A1',
      cardNumber: 1,
      booster: 'Glurak',
      rarity: Rarity.TWO_DIAMONDS,
    });
    expect(repository.searchCards).toHaveBeenCalledWith({
      setKey: 'A1',
      cardNumber: 1,
    });
  });

  it('should not show card details when ID does not exist', async () => {
    await repository.createSet('A1', 'Test Set');
    await repository.createIdOnlyCard(
      'Test Card',
      'A1',
      1,
      Rarity.ONE_DIAMOND,
      [],
    );
    spyOn(repository, 'searchCards');

    const result = await pokemonCardSearchTool.invoke(
      {
        card: 'A2-001', // Non-existent ID
        setKey: null,
        booster: null,
        rarity: null,
        ownershipFilter: null,
      },
      config,
    );

    expect(result).toBe('No cards found matching the search criteria.');
    expect(repository.searchCards).toHaveBeenCalledWith({
      setKey: 'A2',
      cardNumber: 1,
    });
  });
});
