import { PokemonTcgPocketService } from '../PokemonTcgPocketService.js';
import { PokemonTcgPocketRepositoryFake } from '../Fakes/PokemonTcgPocketRepositoryFake.js';
import { Rarity } from '@prisma/client';
import { getContextVariable } from '@langchain/core/context';
import { jest } from '@jest/globals';
import { pokemonCardAddTool } from './pokemonCardAddTool.js';
import { AssertionError } from 'assert';

jest.mock('@langchain/core/context');

describe('pokemonCardAdd', () => {
  let repository: PokemonTcgPocketRepositoryFake;
  let service: PokemonTcgPocketService;

  beforeEach(() => {
    repository = new PokemonTcgPocketRepositoryFake();
    service = new PokemonTcgPocketService(repository, '');
    jest
      .mocked(getContextVariable)
      .mockImplementation(<T>(name: PropertyKey): T | undefined => {
        if (name === 'pokemonTcgPocket') return service as T;
        if (name === 'userId') return BigInt(1) as T;
        return undefined;
      });
  });

  afterEach(() => {
    repository.clear();
    jest.clearAllMocks();
  });

  describe('adding cards', () => {
    it('should add a single card to collection', async () => {
      await repository.createSet('A1', 'Test Set');
      await repository.createCard('Test Card', 'A1', 1, Rarity.ONE_DIAMOND, []);

      const result = (await pokemonCardAddTool.invoke({
        cardId: 'A1-001',
      })) as string;

      expect(result).toContain(
        'Successfully added card to @test1’s collection:',
      );
      expect(result).toContain('A1-001,Test Card,♢,Test Set,,Yes');
      const cards = await repository.searchCards({
        userId: BigInt(1),
      });
      expect(cards[0].owners).toHaveLength(1);
      expect(cards[0].owners[0].id).toBe(BigInt(1));
    });

    it('should refuse to add if multiple matches found', async () => {
      await repository.createSet('A1', 'Test Set');
      await repository.createCard(
        'Test Card 1',
        'A1',
        1,
        Rarity.ONE_DIAMOND,
        [],
      );
      await repository.createCard(
        'Test Card 2',
        'A1',
        2,
        Rarity.ONE_DIAMOND,
        [],
      );

      const result = (await pokemonCardAddTool.invoke({
        rarity: '♢',
      })) as string;

      expect(result).toContain(
        'Multiple matches found. Please ask the user to specify which of these cards they mean. Then call this tool again and provide its card ID:',
      );
      expect(result).toContain('A1-001,Test Card 1,♢,Test Set,,No');
      expect(result).toContain('A1-002,Test Card 2,♢,Test Set,,No');
      const cards = await repository.searchCards({
        userId: BigInt(1),
      });
      expect(cards[0].owners).toHaveLength(0);
      expect(cards[1].owners).toHaveLength(0);
    });

    it('should add multiple cards if bulk operation enabled', async () => {
      await repository.createSet('A1', 'Test Set');
      await repository.createCard(
        'Test Card 1',
        'A1',
        1,
        Rarity.ONE_DIAMOND,
        [],
      );
      await repository.createCard(
        'Test Card 2',
        'A1',
        2,
        Rarity.ONE_DIAMOND,
        [],
      );

      const result = (await pokemonCardAddTool.invoke({
        rarity: '♢',
        bulkOperation: true,
      })) as string;

      expect(result).toContain(
        'Successfully added 2 cards to @test1’s collection:',
      );
      const cards = await repository.searchCards({
        userId: BigInt(1),
      });
      expect(cards[0].owners).toHaveLength(1);
      expect(cards[1].owners).toHaveLength(1);
    });

    it('should not add already owned cards', async () => {
      await repository.createSet('A1', 'Test Set');
      const card = await repository.createCard(
        'Test Card',
        'A1',
        1,
        Rarity.ONE_DIAMOND,
        [],
      );
      await repository.addCardToCollection(card.id, BigInt(1));

      const result = (await pokemonCardAddTool.invoke({
        cardId: 'A1-001',
      })) as string;

      expect(result).toBe(
        'No matching cards found that @test1 is missing. The cards exist but @test1 already owns them. Thus no card was added to the user’s collection.',
      );
    });
  });

  describe('removing cards', () => {
    it('should remove a single card from collection', async () => {
      await repository.createSet('A1', 'Test Set');
      const card = await repository.createCard(
        'Test Card',
        'A1',
        1,
        Rarity.ONE_DIAMOND,
        [],
      );
      await repository.addCardToCollection(card.id, BigInt(1));

      const result = (await pokemonCardAddTool.invoke({
        cardId: 'A1-001',
        remove: true,
      })) as string;

      expect(result).toContain(
        'Successfully removed card from @test1’s collection:',
      );
      expect(result).toContain('A1-001,Test Card,♢,Test Set,,No');
      const cards = await repository.searchCards({
        userId: BigInt(1),
      });
      expect(cards[0].owners).toHaveLength(0);
    });

    it('should refuse to remove if multiple matches found', async () => {
      await repository.createSet('A1', 'Test Set');
      const card1 = await repository.createCard(
        'Test Card 1',
        'A1',
        1,
        Rarity.ONE_DIAMOND,
        [],
      );
      const card2 = await repository.createCard(
        'Test Card 2',
        'A1',
        2,
        Rarity.ONE_DIAMOND,
        [],
      );
      await repository.addCardToCollection(card1.id, BigInt(1));
      await repository.addCardToCollection(card2.id, BigInt(1));

      const result = (await pokemonCardAddTool.invoke({
        rarity: '♢',
        remove: true,
      })) as string;

      expect(result).toContain(
        'Multiple matches found. Please ask the user to specify which of these cards they mean. Then call this tool again and provide its card ID:',
      );
      expect(result).toContain('A1-001,Test Card 1,♢,Test Set,,Yes');
      expect(result).toContain('A1-002,Test Card 2,♢,Test Set,,Yes');
      const cards = await repository.searchCards({
        userId: BigInt(1),
      });
      expect(cards[0].owners).toHaveLength(1);
      expect(cards[1].owners).toHaveLength(1);
    });

    it('should remove multiple cards if bulk operation enabled', async () => {
      await repository.createSet('A1', 'Test Set');
      const card1 = await repository.createCard(
        'Test Card 1',
        'A1',
        1,
        Rarity.ONE_DIAMOND,
        [],
      );
      const card2 = await repository.createCard(
        'Test Card 2',
        'A1',
        2,
        Rarity.ONE_DIAMOND,
        [],
      );
      await repository.addCardToCollection(card1.id, BigInt(1));
      await repository.addCardToCollection(card2.id, BigInt(1));

      const result = (await pokemonCardAddTool.invoke({
        rarity: '♢',
        remove: true,
        bulkOperation: true,
      })) as string;

      expect(result).toContain(
        'Successfully removed 2 cards from @test1’s collection:',
      );
      const cards = await repository.searchCards({
        userId: BigInt(1),
      });
      expect(cards[0].owners).toHaveLength(0);
      expect(cards[1].owners).toHaveLength(0);
    });

    it('should not remove unowned cards', async () => {
      await repository.createSet('A1', 'Test Set');
      await repository.createCard('Test Card', 'A1', 1, Rarity.ONE_DIAMOND, []);

      const result = (await pokemonCardAddTool.invoke({
        cardId: 'A1-001',
        remove: true,
      })) as string;

      expect(result).toBe(
        'No matching cards found in @test1’s collection. The cards exist but @test1 doesn’t own them. Thus no card was removed from the user’s collection.',
      );
    });
  });

  describe('error handling', () => {
    it('should handle invalid card ID format', async () => {
      const result = (await pokemonCardAddTool.invoke({
        cardId: 'invalid',
      })) as string;

      expect(result).toBe(
        'Invalid card ID format. Expected format: {set-key}-{three digit number}, e.g. A1-003',
      );
    });

    it('should throw error when userId not available', async () => {
      jest.mocked(getContextVariable).mockReturnValue(undefined);

      await expect(
        pokemonCardAddTool.invoke({
          cardId: 'A1-001',
        }),
      ).rejects.toThrow(AssertionError);
    });

    it('should indicate when no cards exist at all', async () => {
      const result = (await pokemonCardAddTool.invoke({
        cardName: 'NonexistentCard',
      })) as string;

      expect(result).toBe(
        'No cards exist in the database matching these search criteria. Please verify the card details and try again. Thus no card was added to the user’s collection.',
      );
    });

    it('should indicate when cards exist but user already owns them', async () => {
      await repository.createSet('A1', 'Test Set');
      const card = await repository.createCard(
        'Test Card',
        'A1',
        1,
        Rarity.ONE_DIAMOND,
        [],
      );
      await repository.addCardToCollection(card.id, BigInt(1));

      const result = (await pokemonCardAddTool.invoke({
        cardId: 'A1-001',
      })) as string;

      expect(result).toBe(
        'No matching cards found that @test1 is missing. The cards exist but @test1 already owns them. Thus no card was added to the user’s collection.',
      );
    });

    it('should indicate when cards exist but user does not own them when removing', async () => {
      await repository.createSet('A1', 'Test Set');
      await repository.createCard('Test Card', 'A1', 1, Rarity.ONE_DIAMOND, []);

      const result = (await pokemonCardAddTool.invoke({
        cardId: 'A1-001',
        remove: true,
      })) as string;

      expect(result).toBe(
        'No matching cards found in @test1’s collection. The cards exist but @test1 doesn’t own them. Thus no card was removed from the user’s collection.',
      );
    });

    it('should show first name in error messages when username not available', async () => {
      jest
        .mocked(getContextVariable)
        .mockImplementation(<T>(name: PropertyKey): T | undefined => {
          if (name === 'pokemonTcgPocket') return service as T;
          if (name === 'userId') return BigInt(2) as T;
          return undefined;
        });

      await repository.createSet('A1', 'Test Set');
      const card = await repository.createCard(
        'Test Card',
        'A1',
        1,
        Rarity.ONE_DIAMOND,
        [],
      );
      await repository.addCardToCollection(card.id, BigInt(2));

      const result = (await pokemonCardAddTool.invoke({
        cardId: 'A1-001',
      })) as string;

      expect(result).toBe(
        'No matching cards found that Test2 is missing. The cards exist but Test2 already owns them. Thus no card was added to the user’s collection.',
      );
    });

    it('should show first name in remove error messages when username not available', async () => {
      jest
        .mocked(getContextVariable)
        .mockImplementation(<T>(name: PropertyKey): T | undefined => {
          if (name === 'pokemonTcgPocket') return service as T;
          if (name === 'userId') return BigInt(2) as T;
          return undefined;
        });

      await repository.createSet('A1', 'Test Set');
      await repository.createCard('Test Card', 'A1', 1, Rarity.ONE_DIAMOND, []);

      const result = (await pokemonCardAddTool.invoke({
        cardId: 'A1-001',
        remove: true,
      })) as string;

      expect(result).toBe(
        'No matching cards found in Test2’s collection. The cards exist but Test2 doesn’t own them. Thus no card was removed from the user’s collection.',
      );
    });
  });

  describe('user display', () => {
    beforeEach(async () => {
      await repository.createSet('A1', 'Test Set');
      await repository.createCard('Test Card', 'A1', 1, Rarity.ONE_DIAMOND, []);
    });

    it('should show username when available', async () => {
      jest
        .mocked(getContextVariable)
        .mockImplementation(<T>(name: PropertyKey): T | undefined => {
          if (name === 'pokemonTcgPocket') return service as T;
          if (name === 'userId') return BigInt(1) as T;
          return undefined;
        });

      const result = (await pokemonCardAddTool.invoke({
        cardId: 'A1-001',
      })) as string;

      expect(result).toContain(
        'Successfully added card to @test1’s collection:',
      );
      expect(result).toContain('Owned by @test1');
    });

    it('should show first name when username not available', async () => {
      jest
        .mocked(getContextVariable)
        .mockImplementation(<T>(name: PropertyKey): T | undefined => {
          if (name === 'pokemonTcgPocket') return service as T;
          if (name === 'userId') return BigInt(2) as T;
          return undefined;
        });

      const result = (await pokemonCardAddTool.invoke({
        cardId: 'A1-001',
      })) as string;

      expect(result).toContain(
        'Successfully added card to Test2’s collection:',
      );
      expect(result).toContain('Owned by Test2');
    });

    it('should show first name in bulk operation messages when username not available', async () => {
      jest
        .mocked(getContextVariable)
        .mockImplementation(<T>(name: PropertyKey): T | undefined => {
          if (name === 'pokemonTcgPocket') return service as T;
          if (name === 'userId') return BigInt(2) as T;
          return undefined;
        });

      await repository.createCard(
        'Test Card 1',
        'A1',
        1,
        Rarity.ONE_DIAMOND,
        [],
      );
      await repository.createCard(
        'Test Card 2',
        'A1',
        2,
        Rarity.ONE_DIAMOND,
        [],
      );

      const result = (await pokemonCardAddTool.invoke({
        rarity: '♢',
        bulkOperation: true,
      })) as string;

      expect(result).toContain(
        'Successfully added 2 cards to Test2’s collection:',
      );
      expect(result).toContain('Owned by Test2');
    });

    it('should show first name in remove error messages when username not available', async () => {
      jest
        .mocked(getContextVariable)
        .mockImplementation(<T>(name: PropertyKey): T | undefined => {
          if (name === 'pokemonTcgPocket') return service as T;
          if (name === 'userId') return BigInt(2) as T;
          return undefined;
        });

      await repository.createSet('A1', 'Test Set');
      await repository.createCard('Test Card', 'A1', 1, Rarity.ONE_DIAMOND, []);

      const result = (await pokemonCardAddTool.invoke({
        cardId: 'A1-001',
        remove: true,
      })) as string;

      expect(result).toBe(
        'No matching cards found in Test2’s collection. The cards exist but Test2 doesn’t own them. Thus no card was removed from the user’s collection.',
      );
    });

    it('should show first name in bulk remove messages when username not available', async () => {
      jest
        .mocked(getContextVariable)
        .mockImplementation(<T>(name: PropertyKey): T | undefined => {
          if (name === 'pokemonTcgPocket') return service as T;
          if (name === 'userId') return BigInt(2) as T;
          return undefined;
        });

      await repository.createSet('A1', 'Test Set');
      const card1 = await repository.createCard(
        'Test Card 1',
        'A1',
        1,
        Rarity.ONE_DIAMOND,
        [],
      );
      const card2 = await repository.createCard(
        'Test Card 2',
        'A1',
        2,
        Rarity.ONE_DIAMOND,
        [],
      );
      await repository.addCardToCollection(card1.id, BigInt(2));
      await repository.addCardToCollection(card2.id, BigInt(2));

      const result = (await pokemonCardAddTool.invoke({
        rarity: '♢',
        remove: true,
        bulkOperation: true,
      })) as string;

      expect(result).toContain(
        'Successfully removed 2 cards from Test2’s collection:',
      );
      expect(result).toContain('Owned by Test2');
    });
  });

  describe('output format', () => {
    it('should include collection stats after adding a card', async () => {
      await repository.createSet('A1', 'Test Set');
      await repository.createCard('Test Card', 'A1', 1, Rarity.ONE_DIAMOND, []);

      const result = (await pokemonCardAddTool.invoke({
        cardId: 'A1-001',
      })) as string;

      expect(result).toContain('Successfully added card');
      expect(result).toContain('Test Set: ♦️ 1/1');
      expect(result).toContain('♦️ is the number of different cards');
    });

    it('should include collection stats after removing a card', async () => {
      await repository.createSet('A1', 'Test Set');
      const card = await repository.createCard(
        'Test Card',
        'A1',
        1,
        Rarity.ONE_DIAMOND,
        [],
      );
      await repository.addCardToCollection(card.id, BigInt(1));

      const result = (await pokemonCardAddTool.invoke({
        cardId: 'A1-001',
        remove: true,
      })) as string;

      expect(result).toContain('Successfully removed card');
      expect(result).toContain('Test Set: ♦️ 0/1');
      expect(result).toContain('♦️ is the number of different cards');
    });

    it('should include collection stats after bulk operations', async () => {
      await repository.createSet('A1', 'Test Set');
      await repository.createCard(
        'Test Card 1',
        'A1',
        1,
        Rarity.ONE_DIAMOND,
        [],
      );
      await repository.createCard(
        'Test Card 2',
        'A1',
        2,
        Rarity.ONE_DIAMOND,
        [],
      );

      const result = (await pokemonCardAddTool.invoke({
        rarity: '♢',
        bulkOperation: true,
      })) as string;

      expect(result).toContain('Successfully added 2 cards');
      expect(result).toContain('Test Set: ♦️ 2/2');
      expect(result).toContain('♦️ is the number of different cards');
    });
  });
});
