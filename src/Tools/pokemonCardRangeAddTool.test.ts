import { describe, beforeEach, it, afterEach, expect } from 'bun:test';
import {
  PokemonTcgPocketService,
  Sets,
} from '../PokemonTcgPocket/PokemonTcgPocketService.js';
import { PokemonTcgPocketRepositoryFake } from '../PokemonTcgPocket/Fakes/PokemonTcgPocketRepositoryFake.js';
import { PokemonTcgPocketProbabilityService } from '../PokemonTcgPocket/PokemonTcgPocketProbabilityService.js';
import { pokemonCardRangeAddTool } from './pokemonCardRangeAddTool.js';
import { createTestToolConfig, ToolContext } from '../ChatGptAgentService.js';
import { OwnershipStatus } from '@prisma/client';

describe('pokemonCardRangeAdd', () => {
  let repository: PokemonTcgPocketRepositoryFake;
  let probabilityService: PokemonTcgPocketProbabilityService;
  let config: { configurable: ToolContext };

  beforeEach(async () => {
    repository = new PokemonTcgPocketRepositoryFake();
    probabilityService = new PokemonTcgPocketProbabilityService();
    config = createTestToolConfig({
      userId: BigInt(1),
      pokemonTcgPocketService: new PokemonTcgPocketService(
        probabilityService,
        repository,
        {} as Sets,
      ),
    });

    // Set up test data
    await repository.createSet('A1', 'Test Set');
    await repository.createBooster('Test Booster', 'A1');

    // Create cards 1-5 in set A1
    for (let i = 1; i <= 5; i++) {
      await repository.createCard({
        name: `Card ${i}`,
        setKey: 'A1',
        number: i,
        rarity: null,
        boosterNames: ['Test Booster'],
        isSixPackOnly: false,
      });
    }
  });

  afterEach(() => {
    repository.clear();
  });

  describe('input validation', () => {
    it('should reject start number greater than end number', async () => {
      const result = await pokemonCardRangeAddTool.invoke(
        {
          setKey: 'A1',
          startNumber: 10,
          endNumber: 5,
        },
        config,
      );

      expect(result).toBe(
        'Start number (10) cannot be greater than end number (5). Please check your range.',
      );
    });

    it('should handle non-existent set', async () => {
      const result = await pokemonCardRangeAddTool.invoke(
        {
          setKey: 'A2', // Valid setKey but no cards created for this set
          startNumber: 1,
          endNumber: 3,
        },
        config,
      );

      expect(result).toBe(
        'No cards found in range A2-001 to A2-003. Please check that the set key and range are valid.',
      );
    });

    it('should handle range with no cards', async () => {
      const result = await pokemonCardRangeAddTool.invoke(
        {
          setKey: 'A1',
          startNumber: 10,
          endNumber: 20,
        },
        config,
      );

      expect(result).toBe(
        'No cards found in range A1-010 to A1-020. Please check that the set key and range are valid.',
      );
    });

    it('should handle partial range with missing cards', async () => {
      // Only created cards 1-5, try to add 1-10 (5 missing)
      const result = await pokemonCardRangeAddTool.invoke(
        {
          setKey: 'A1',
          startNumber: 1,
          endNumber: 10,
        },
        config,
      );

      expect(result).toBe(
        'Found only 5 of 10 expected cards in range A1-001 to A1-010. 5 cards are missing from this range. Please verify the range contains valid card numbers.',
      );
    });
  });

  describe('card addition logic', () => {
    it('should add multiple cards from range', async () => {
      const result = await pokemonCardRangeAddTool.invoke(
        {
          setKey: 'A1',
          startNumber: 2,
          endNumber: 4,
        },
        config,
      );

      // Should contain bulk operation message and CSV data
      expect(result).toContain('Successfully added 3 cards to');
      expect(result).toContain('A1-002,Card 2');
      expect(result).toContain('A1-003,Card 3');
      expect(result).toContain('A1-004,Card 4');
    });

    it('should handle single card range', async () => {
      const result = await pokemonCardRangeAddTool.invoke(
        {
          setKey: 'A1',
          startNumber: 1,
          endNumber: 1,
        },
        config,
      );

      // Should contain bulk operation message (even for single card)
      expect(result).toContain('Successfully added 1 cards to');
      expect(result).toContain('A1-001,Card 1');
    });

    it('should handle already owned cards (upsert behavior)', async () => {
      // First, add a card manually
      const cards = await repository.searchCards({
        setKey: 'A1',
        cardNumber: 2,
      });
      await repository.addCardToCollection(cards[0].id, BigInt(1));

      const result = await pokemonCardRangeAddTool.invoke(
        {
          setKey: 'A1',
          startNumber: 1,
          endNumber: 3,
        },
        config,
      );

      // Should still add all 3 cards (including the already owned one)
      expect(result).toContain('Successfully added 3 cards to');
      expect(result).toContain('A1-001,Card 1');
      expect(result).toContain('A1-002,Card 2');
      expect(result).toContain('A1-003,Card 3');
    });

    it('should update NOT_NEEDED cards to OWNED', async () => {
      // Set card 2 as NOT_NEEDED
      const cards = await repository.searchCards({
        setKey: 'A1',
        cardNumber: 2,
      });
      await repository.addCardToCollection(
        cards[0].id,
        BigInt(1),
        OwnershipStatus.NOT_NEEDED,
      );

      const result = await pokemonCardRangeAddTool.invoke(
        {
          setKey: 'A1',
          startNumber: 1,
          endNumber: 3,
        },
        config,
      );

      // Should add all 3 cards and update the NOT_NEEDED one to OWNED
      expect(result).toContain('Successfully added 3 cards to');
      expect(result).toContain('A1-002,Card 2');

      // Verify the status was updated
      const updatedCards = await repository.searchCards({
        setKey: 'A1',
        cardNumber: 2,
      });
      const ownership = updatedCards[0].ownership.find(
        (o) => o.userId === BigInt(1),
      );
      expect(ownership?.status).toBe(OwnershipStatus.OWNED);
    });

    it('should handle range with mixed ownership statuses', async () => {
      // Set up mixed ownership states:
      // Card 1: OWNED
      // Card 2: NOT_NEEDED
      // Card 3: missing (no ownership record)
      // Card 4: missing (no ownership record)
      const cards = await repository.searchCards({ setKey: 'A1' });

      await repository.addCardToCollection(
        cards[0].id, // Card 1
        BigInt(1),
        OwnershipStatus.OWNED,
      );

      await repository.addCardToCollection(
        cards[1].id, // Card 2
        BigInt(1),
        OwnershipStatus.NOT_NEEDED,
      );

      // Cards 3 and 4 remain missing (no ownership records)

      const result = await pokemonCardRangeAddTool.invoke(
        {
          setKey: 'A1',
          startNumber: 1,
          endNumber: 4,
        },
        config,
      );

      // Should add all 4 cards successfully
      expect(result).toContain('Successfully added 4 cards to');
      expect(result).toContain('A1-001,Card 1');
      expect(result).toContain('A1-002,Card 2');
      expect(result).toContain('A1-003,Card 3');
      expect(result).toContain('A1-004,Card 4');

      // Verify all cards are now OWNED
      for (let i = 1; i <= 4; i++) {
        const updatedCards = await repository.searchCards({
          setKey: 'A1',
          cardNumber: i,
        });
        const ownership = updatedCards[0].ownership.find(
          (o) => o.userId === BigInt(1),
        );
        expect(ownership?.status).toBe(OwnershipStatus.OWNED);
      }
    });
  });
});
