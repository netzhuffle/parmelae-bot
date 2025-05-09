import { PokemonTcgPocketService } from '../PokemonTcgPocket/PokemonTcgPocketService.js';
import { PokemonTcgPocketRepositoryFake } from '../PokemonTcgPocket/Fakes/PokemonTcgPocketRepositoryFake.js';
import { PokemonTcgPocketProbabilityService } from '../PokemonTcgPocket/PokemonTcgPocketProbabilityService.js';
import { Rarity } from '@prisma/client';
import { jest } from '@jest/globals';
import { pokemonCardAddTool } from './pokemonCardAddTool.js';
import { createTestToolConfig, ToolContext } from '../ChatGptAgentService.js';

jest.mock('@langchain/core/context');

describe('pokemonCardAdd', () => {
  let repository: PokemonTcgPocketRepositoryFake;
  let probabilityService: PokemonTcgPocketProbabilityService;
  let config: { configurable: ToolContext };

  beforeEach(() => {
    repository = new PokemonTcgPocketRepositoryFake();
    probabilityService = new PokemonTcgPocketProbabilityService();
    config = createTestToolConfig({
      userId: BigInt(1),
      pokemonTcgPocketService: new PokemonTcgPocketService(
        probabilityService,
        repository,
        '',
      ),
    });
  });

  afterEach(() => {
    repository.clear();
  });

  describe('adding cards', () => {
    it('should add a single card to collection using card ID', async () => {
      await repository.createSet('A1', 'Test Set');
      await repository.createCard('Test Card', 'A1', 1, Rarity.ONE_DIAMOND, []);

      const result = await pokemonCardAddTool.invoke(
        {
          card: 'A1-001',
          rarity: null,
          remove: false,
          setKey: null,
          booster: null,
          bulkOperation: false,
        },
        config,
      );

      expect(result).toContain('added card to @test1');
      expect(result).toContain('ID,Name,Rarity,Set,Boosters,Owned by @test1');
      expect(result).toContain('A1-001,Test Card,♢,Test Set,,Yes');
    });

    it('should add a single card to collection using card name', async () => {
      await repository.createSet('A1', 'Test Set');
      await repository.createCard('Test Card', 'A1', 1, Rarity.ONE_DIAMOND, []);

      const result = await pokemonCardAddTool.invoke(
        {
          card: 'Test Card',
          rarity: null,
          remove: false,
          setKey: null,
          booster: null,
          bulkOperation: false,
        },
        config,
      );

      expect(result).toContain('added card to @test1');
      expect(result).toContain('ID,Name,Rarity,Set,Boosters,Owned by @test1');
      expect(result).toContain('A1-001,Test Card,♢,Test Set,,Yes');
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

      const result = await pokemonCardAddTool.invoke(
        {
          card: null,
          rarity: '♢',
          remove: false,
          setKey: null,
          booster: null,
          bulkOperation: false,
        },
        config,
      );

      expect(result).toContain(
        'Multiple matches found. Please ask the user to specify which of these cards they mean. Then call this tool again and provide its card ID:',
      );
      expect(result).toContain('A1-001,Test Card 1,♢,Test Set,,No');
      expect(result).toContain('A1-002,Test Card 2,♢,Test Set,,No');
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

      const result = await pokemonCardAddTool.invoke(
        {
          card: null,
          rarity: '♢',
          remove: false,
          setKey: null,
          booster: null,
          bulkOperation: true,
        },
        config,
      );

      expect(result).toContain('added 2 cards to @test1');
      expect(result).toContain('ID,Name,Rarity,Set,Boosters,Owned by @test1');
      expect(result).toContain('A1-001,Test Card 1,♢,Test Set,,Yes');
      expect(result).toContain('A1-002,Test Card 2,♢,Test Set,,Yes');
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

      const result = await pokemonCardAddTool.invoke(
        {
          card: 'A1-001',
          rarity: null,
          remove: false,
          setKey: null,
          booster: null,
          bulkOperation: false,
        },
        config,
      );

      expect(result).toContain('@test1 already owns them');
      expect(result).toContain('A1-001,Test Card,♢,Test Set,,Yes');
      expect(result).toContain('no card was added');
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

      const result = await pokemonCardAddTool.invoke(
        {
          card: 'A1-001',
          remove: true,
          rarity: null,
          setKey: null,
          booster: null,
          bulkOperation: false,
        },
        config,
      );

      expect(result).toContain('removed card from @test1');
      expect(result).toContain('ID,Name,Rarity,Set,Boosters,Owned by @test1');
      expect(result).toContain('A1-001,Test Card,♢,Test Set,,No');
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

      const result = await pokemonCardAddTool.invoke(
        {
          card: null,
          rarity: '♢',
          remove: true,
          setKey: null,
          booster: null,
          bulkOperation: false,
        },
        config,
      );

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

      const result = await pokemonCardAddTool.invoke(
        {
          card: null,
          rarity: '♢',
          remove: true,
          setKey: null,
          booster: null,
          bulkOperation: true,
        },
        config,
      );

      expect(result).toContain('removed 2 cards from @test1');
      expect(result).toContain('ID,Name,Rarity,Set,Boosters,Owned by @test1');
    });

    it('should not remove unowned cards', async () => {
      await repository.createSet('A1', 'Test Set');
      await repository.createCard('Test Card', 'A1', 1, Rarity.ONE_DIAMOND, []);

      const result = await pokemonCardAddTool.invoke(
        {
          card: 'A1-001',
          remove: true,
          rarity: null,
          setKey: null,
          booster: null,
          bulkOperation: false,
        },
        config,
      );

      expect(result).toContain('@test1 does not own them');
      expect(result).toContain('A1-001,Test Card,♢,Test Set,,No');
      expect(result).toContain('no card was removed');
    });
  });

  describe('error handling', () => {
    it('should indicate when no cards exist at all', async () => {
      const result = await pokemonCardAddTool.invoke(
        {
          card: 'NonexistentCard',
          rarity: null,
          remove: false,
          setKey: null,
          booster: null,
          bulkOperation: false,
        },
        config,
      );

      expect(result).toContain('No cards exist');
      expect(result).toContain('no card was added');
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

      const result = await pokemonCardAddTool.invoke(
        {
          card: 'A1-001',
          rarity: null,
          remove: false,
          setKey: null,
          booster: null,
          bulkOperation: false,
        },
        config,
      );

      expect(result).toContain('@test1 already owns them');
      expect(result).toContain('A1-001,Test Card,♢,Test Set,,Yes');
      expect(result).toContain('no card was added');
    });

    it('should indicate when cards exist but user does not own them when removing', async () => {
      await repository.createSet('A1', 'Test Set');
      await repository.createCard('Test Card', 'A1', 1, Rarity.ONE_DIAMOND, []);

      const result = await pokemonCardAddTool.invoke(
        {
          card: 'A1-001',
          remove: true,
          rarity: null,
          setKey: null,
          booster: null,
          bulkOperation: false,
        },
        config,
      );

      expect(result).toContain('@test1 does not own them');
      expect(result).toContain('A1-001,Test Card,♢,Test Set,,No');
      expect(result).toContain('no card was removed');
    });

    it('should show first name in error messages when username not available', async () => {
      config.configurable.userId = BigInt(2);

      await repository.createSet('A1', 'Test Set');
      const card = await repository.createCard(
        'Test Card',
        'A1',
        1,
        Rarity.ONE_DIAMOND,
        [],
      );
      await repository.addCardToCollection(card.id, BigInt(2));

      const result = await pokemonCardAddTool.invoke(
        {
          card: 'A1-001',
          rarity: null,
          remove: false,
          setKey: null,
          booster: null,
          bulkOperation: false,
        },
        config,
      );

      expect(result).toContain('Test2 already owns them');
      expect(result).toContain('A1-001,Test Card,♢,Test Set,,Yes');
      expect(result).toContain('no card was added');
    });

    it('should show first name in remove error messages when username not available', async () => {
      config.configurable.userId = BigInt(2);

      await repository.createSet('A1', 'Test Set');
      await repository.createCard('Test Card', 'A1', 1, Rarity.ONE_DIAMOND, []);

      const result = await pokemonCardAddTool.invoke(
        {
          card: 'A1-001',
          remove: true,
          rarity: null,
          setKey: null,
          booster: null,
          bulkOperation: false,
        },
        config,
      );

      expect(result).toContain('Test2 does not own them');
      expect(result).toContain('A1-001,Test Card,♢,Test Set,,No');
      expect(result).toContain('no card was removed');
    });
  });

  describe('user display', () => {
    beforeEach(async () => {
      await repository.createSet('A1', 'Test Set');
      await repository.createCard('Test Card', 'A1', 1, Rarity.ONE_DIAMOND, []);
    });

    it('should show username when available', async () => {
      const result = await pokemonCardAddTool.invoke(
        {
          card: 'A1-001',
          rarity: null,
          remove: false,
          setKey: null,
          booster: null,
          bulkOperation: false,
        },
        config,
      );

      expect(result).toContain('added card to @test1');
      expect(result).toContain('ID,Name,Rarity,Set,Boosters,Owned by @test1');
      expect(result).toContain('A1-001,Test Card,♢,Test Set,,Yes');
    });

    it('should show first name when username not available', async () => {
      config.configurable.userId = BigInt(2);

      await repository.createSet('A1', 'Test Set');
      await repository.createCard('Test Card', 'A1', 1, Rarity.ONE_DIAMOND, []);

      const result = await pokemonCardAddTool.invoke(
        {
          card: 'A1-001',
          rarity: null,
          remove: false,
          setKey: null,
          booster: null,
          bulkOperation: false,
        },
        config,
      );

      expect(result).toContain('added card to Test2');
      expect(result).toContain('ID,Name,Rarity,Set,Boosters,Owned by Test2');
      expect(result).toContain('A1-001,Test Card,♢,Test Set,,Yes');
    });

    it('should show first name in bulk operation messages when username not available', async () => {
      config.configurable.userId = BigInt(2);

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

      const result = await pokemonCardAddTool.invoke(
        {
          card: null,
          setKey: null,
          booster: null,
          rarity: '♢',
          remove: false,
          bulkOperation: true,
        },
        config,
      );

      expect(result).toContain('added 2 cards to Test2');
      expect(result).toContain('ID,Name,Rarity,Set,Boosters,Owned by Test2');
      expect(result).toContain('A1-001,Test Card 1,♢,Test Set,,Yes');
      expect(result).toContain('A1-002,Test Card 2,♢,Test Set,,Yes');
    });

    it('should show first name in remove error messages when username not available', async () => {
      config.configurable.userId = BigInt(2);

      await repository.createSet('A1', 'Test Set');
      await repository.createCard('Test Card', 'A1', 1, Rarity.ONE_DIAMOND, []);

      const result = await pokemonCardAddTool.invoke(
        {
          card: 'A1-001',
          remove: true,
          rarity: null,
          setKey: null,
          booster: null,
          bulkOperation: false,
        },
        config,
      );

      expect(result).toContain('No matching cards found in Test2');
      expect(result).toContain('The cards exist');
      expect(result).toContain('ID,Name,Rarity,Set,Boosters,Owned by Test2');
      expect(result).toContain('A1-001,Test Card,♢,Test Set,,No');
    });

    it('should show first name in bulk remove messages when username not available', async () => {
      config.configurable.userId = BigInt(2);

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

      const result = await pokemonCardAddTool.invoke(
        {
          card: null,
          setKey: null,
          booster: null,
          rarity: null,
          remove: true,
          bulkOperation: true,
        },
        config,
      );

      expect(result).toContain('removed 2 cards from Test2');
      expect(result).toContain('ID,Name,Rarity,Set,Boosters,Owned by Test2');
      expect(result).toContain('A1-001,Test Card 1,♢,Test Set,,No');
      expect(result).toContain('A1-002,Test Card 2,♢,Test Set,,No');
    });
  });

  describe('output format', () => {
    it('should include collection stats after adding a card', async () => {
      await repository.createSet('A1', 'Test Set');
      await repository.createCard('Test Card', 'A1', 1, Rarity.ONE_DIAMOND, []);

      const result = await pokemonCardAddTool.invoke(
        {
          card: 'A1-001',
          rarity: null,
          remove: false,
          setKey: null,
          booster: null,
          bulkOperation: false,
        },
        config,
      );

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

      const result = await pokemonCardAddTool.invoke(
        {
          card: 'A1-001',
          remove: true,
          rarity: null,
          setKey: null,
          booster: null,
          bulkOperation: false,
        },
        config,
      );

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

      const result = await pokemonCardAddTool.invoke(
        {
          card: null,
          setKey: null,
          booster: null,
          rarity: '♢',
          remove: false,
          bulkOperation: true,
        },
        config,
      );

      expect(result).toContain('Successfully added 2 cards');
      expect(result).toContain('Test Set: ♦️ 2/2');
      expect(result).toContain('♦️ is the number of different cards');
    });

    it('should include collection stats after adding multiple cards', async () => {
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

      const result = await pokemonCardAddTool.invoke(
        {
          card: null,
          setKey: null,
          booster: null,
          rarity: '♢',
          remove: false,
          bulkOperation: true,
        },
        config,
      );

      expect(result).toContain('added 2 cards to @test1');
      expect(result).toContain('ID,Name,Rarity,Set,Boosters,Owned by @test1');
      expect(result).toContain('A1-001,Test Card 1,♢,Test Set,,Yes');
      expect(result).toContain('A1-002,Test Card 2,♢,Test Set,,Yes');
    });

    it('should include collection stats after removing multiple cards', async () => {
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

      const result = await pokemonCardAddTool.invoke(
        {
          card: null,
          setKey: null,
          booster: null,
          rarity: '♢',
          remove: true,
          bulkOperation: true,
        },
        config,
      );

      expect(result).toContain('removed 2 cards from @test1');
      expect(result).toContain('ID,Name,Rarity,Set,Boosters,Owned by @test1');
      expect(result).toContain('A1-001,Test Card 1,♢,Test Set,,No');
      expect(result).toContain('A1-002,Test Card 2,♢,Test Set,,No');
    });
  });

  describe('card ID exists but additional criteria do not match', () => {
    beforeEach(async () => {
      await repository.createSet('A1', 'Test Set');
      await repository.createIdOnlyCard(
        'Test Card',
        'A1',
        1,
        Rarity.ONE_DIAMOND,
        [],
      );
      jest.spyOn(repository, 'searchCards');
    });

    it('should show card details when adding with mismatched criteria', async () => {
      const result = await pokemonCardAddTool.invoke(
        {
          card: 'A1-001',
          setKey: null,
          booster: null,
          rarity: '✸',
          remove: false,
          bulkOperation: false,
        },
        config,
      );

      expect(result).toContain(
        'Card with ID A1-001 exists but does not match the additional search criteria:',
      );
      expect(result).toContain('Test Card');
      expect(result).toContain('no card was added');
      expect(repository.searchCards).toHaveBeenCalledWith({
        setKey: 'A1',
        cardNumber: 1,
        rarity: Rarity.ONE_SHINY,
      });
      expect(repository.searchCards).toHaveBeenCalledWith({
        setKey: 'A1',
        cardNumber: 1,
      });
    });

    it('should show card details when removing with mismatched criteria', async () => {
      const result = await pokemonCardAddTool.invoke(
        {
          card: 'A1-001',
          setKey: null,
          booster: null,
          rarity: '☆', // Wrong rarity
          remove: true,
          bulkOperation: false,
        },
        config,
      );

      expect(result).toContain(
        'Card with ID A1-001 exists but does not match the additional search criteria:',
      );
      expect(result).toContain('Test Card');
      expect(result).toContain('no card was removed');
      expect(repository.searchCards).toHaveBeenCalledWith({
        setKey: 'A1',
        cardNumber: 1,
        rarity: Rarity.ONE_STAR,
      });
      expect(repository.searchCards).toHaveBeenCalledWith({
        setKey: 'A1',
        cardNumber: 1,
      });
    });

    it('should show card details with multiple mismatched criteria', async () => {
      const result = await pokemonCardAddTool.invoke(
        {
          card: 'A1-001',
          setKey: null,
          booster: 'Glurak', // Wrong booster
          rarity: '♢♢', // Wrong rarity
          remove: false,
          bulkOperation: false,
        },
        config,
      );

      expect(result).toContain(
        'Card with ID A1-001 exists but does not match the additional search criteria:',
      );
      expect(result).toContain('Test Card');
      expect(result).toContain('no card was added');
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
      const result = await pokemonCardAddTool.invoke(
        {
          card: 'A2-001', // Non-existent ID
          setKey: null,
          booster: null,
          rarity: null,
          remove: false,
          bulkOperation: false,
        },
        config,
      );

      expect(result).toContain(
        'No cards exist in the database matching these search criteria',
      );
      expect(result).toContain('no card was added');
      expect(repository.searchCards).toHaveBeenCalledWith({
        setKey: 'A2',
        cardNumber: 1,
      });
    });
  });
});
