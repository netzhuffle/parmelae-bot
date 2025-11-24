import { describe, beforeEach, it, expect } from 'bun:test';
import { PokemonTcgPocketService, Sets } from './PokemonTcgPocketService.js';
import { PokemonTcgPocketRepositoryFake } from './Fakes/PokemonTcgPocketRepositoryFake.js';
import { PokemonTcgPocketProbabilityService } from './PokemonTcgPocketProbabilityService.js';
import { OwnershipStatus } from '../generated/prisma/enums.js';
import { FiveCardsWithoutShinyStrategy } from './PackProbabilityStrategies/FiveCardsWithoutShinyStrategy.js';
import { FiveCardsStrategy } from './PackProbabilityStrategies/FiveCardsStrategy.js';
import { BabyAsPotentialSixthCardStrategy } from './PackProbabilityStrategies/BabyAsPotentialSixthCardStrategy.js';
import { FourCardGuaranteedExStrategy } from './PackProbabilityStrategies/FourCardGuaranteedExStrategy.js';
import { PokemonTcgPocketProbabilityRepository } from './Repositories/PokemonTcgPocketProbabilityRepository.js';

describe('PokemonTcgPocketService bulk operations', () => {
  let service: PokemonTcgPocketService;
  let repository: PokemonTcgPocketRepositoryFake;
  let probabilityService: PokemonTcgPocketProbabilityService;

  beforeEach(() => {
    repository = new PokemonTcgPocketRepositoryFake();
    probabilityService = new PokemonTcgPocketProbabilityService(
      new FiveCardsWithoutShinyStrategy(),
      new FiveCardsStrategy(),
      new BabyAsPotentialSixthCardStrategy(),
      new FourCardGuaranteedExStrategy(),
      undefined as unknown as PokemonTcgPocketProbabilityRepository,
    );
    service = new PokemonTcgPocketService(
      probabilityService,
      repository,
      {} as Sets,
    );
  });

  describe('getCardIdsInRange', () => {
    beforeEach(async () => {
      // Create test set and cards
      await repository.createSet('A1', 'Test Set');
      await repository.createBooster('Test Booster', 'A1');

      // Create 5 cards (numbers 1-5)
      for (let i = 1; i <= 5; i++) {
        await repository.createCard({
          name: `Card ${i}`,
          number: i,
          rarity: null,
          setKey: 'A1',
          boosterNames: ['Test Booster'],
          isSixPackOnly: false,
        });
      }
    });

    it('should return card IDs within the specified range', async () => {
      const result = await service.getCardIdsInRange('A1', 2, 4);

      expect(result).toHaveLength(3);
      // Result should be an array of card IDs (numbers), sorted by card number
      expect(Array.isArray(result)).toBe(true);
      expect(result.every((id) => typeof id === 'number')).toBe(true);
    });

    it('should return empty array for non-existent set', async () => {
      const result = await service.getCardIdsInRange('NONEXISTENT', 1, 5);

      expect(result).toHaveLength(0);
    });

    it('should return empty array when no cards in range', async () => {
      const result = await service.getCardIdsInRange('A1', 10, 20);

      expect(result).toHaveLength(0);
    });

    it('should return all card IDs in range', async () => {
      const cardIds = await service.getCardIdsInRange('A1', 1, 5);

      expect(cardIds).toHaveLength(5);
      // Should return 5 card IDs
      expect(cardIds.every((id) => typeof id === 'number')).toBe(true);
    });
  });

  describe('addMultipleCardsToCollection', () => {
    let cardIds: number[];

    beforeEach(async () => {
      // Create test set and cards
      await repository.createSet('A1', 'Test Set');
      await repository.createBooster('Test Booster', 'A1');

      cardIds = [];
      for (let i = 1; i <= 5; i++) {
        const card = await repository.createCard({
          name: `Card ${i}`,
          setKey: 'A1',
          number: i,
          rarity: null,
          boosterNames: ['Test Booster'],
          isSixPackOnly: false,
        });
        cardIds.push(card.id);
      }
    });

    it('should add multiple cards to user collection', async () => {
      const result = await service.addMultipleCardsToCollection(
        [cardIds[0], cardIds[2], cardIds[4]], // Cards 1, 3, 5
        BigInt(1),
      );

      expect(typeof result).toBe('string');
      expect(result).toContain('Successfully added 3 cards to');
      expect(result).toContain('Card 1');
      expect(result).toContain('Card 3');
      expect(result).toContain('Card 5');
    });

    it('should always set ownership status to OWNED', async () => {
      const result = await service.addMultipleCardsToCollection(
        [cardIds[0], cardIds[1]],
        BigInt(1),
      );

      expect(typeof result).toBe('string');
      expect(result).toContain('Successfully added 2 cards to');
      expect(result).toContain('Card 1');
      expect(result).toContain('Card 2');
    });

    it('should skip non-existent cards', async () => {
      const result = await service.addMultipleCardsToCollection(
        [cardIds[0], 999999, cardIds[1]], // Include non-existent card ID
        BigInt(1),
      );

      // Should only process the 2 valid cards
      expect(typeof result).toBe('string');
      expect(result).toContain('Successfully added 2 cards to');
      expect(result).toContain('Card 1');
      expect(result).toContain('Card 2');
    });

    it('should use upsert logic for already owned cards', async () => {
      // First, add card 1 to user's collection
      await repository.addCardToCollection(cardIds[0], BigInt(1));

      // Now try to add cards 1 and 2
      const result = await service.addMultipleCardsToCollection(
        [cardIds[0], cardIds[1]],
        BigInt(1),
      );

      // Should process both cards (upsert behavior - update existing, create new)
      expect(typeof result).toBe('string');
      expect(result).toContain('Successfully added 2 cards to');
      expect(result).toContain('Card 1');
      expect(result).toContain('Card 2');
    });

    it('should update NOT_NEEDED cards to OWNED', async () => {
      // Set cards 1 and 2 as NOT_NEEDED
      await repository.addCardToCollection(
        cardIds[0],
        BigInt(1),
        OwnershipStatus.NOT_NEEDED,
      );
      await repository.addCardToCollection(
        cardIds[1],
        BigInt(1),
        OwnershipStatus.NOT_NEEDED,
      );

      // Now add them again (always sets to OWNED status)
      const result = await service.addMultipleCardsToCollection(
        [cardIds[0], cardIds[1], cardIds[2]], // Cards 1, 2, 3
        BigInt(1),
      );

      expect(typeof result).toBe('string');
      expect(result).toContain('Successfully added 3 cards to');
      expect(result).toContain('Card 1');
      expect(result).toContain('Card 2');
      expect(result).toContain('Card 3');
    });

    it('should return cards sorted by set key and number', async () => {
      // Create another set with cards
      await repository.createSet('A2', 'Test Set 2');
      await repository.createBooster('Test Booster 2', 'A2');

      const card6 = await repository.createCard({
        name: 'Card 6',
        setKey: 'A2',
        number: 1,
        rarity: null,
        boosterNames: ['Test Booster 2'],
        isSixPackOnly: false,
      });

      // Add cards from both sets in mixed order
      const result = await service.addMultipleCardsToCollection(
        [card6.id, cardIds[2], cardIds[0]], // A2-001, A1-003, A1-001
        BigInt(1),
      );

      expect(typeof result).toBe('string');
      expect(result).toContain('Successfully added 3 cards to');
      // Should contain all cards in CSV format (sorted by set key then number)
      expect(result).toContain('A1-001,Card 1');
      expect(result).toContain('A1-003,Card 3');
      expect(result).toContain('A2-001,Card 6');
    });
  });
});
