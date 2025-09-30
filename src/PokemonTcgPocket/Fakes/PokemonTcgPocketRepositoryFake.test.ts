import { describe, beforeEach, it, expect } from 'bun:test';
import { PokemonTcgPocketRepositoryFake } from './PokemonTcgPocketRepositoryFake.js';
import { Rarity } from '../../generated/prisma/enums.js';

describe('PokemonTcgPocketRepositoryFake', () => {
  let repository: PokemonTcgPocketRepositoryFake;

  beforeEach(() => {
    repository = new PokemonTcgPocketRepositoryFake();
  });

  describe('card key consistency', () => {
    it('should use consistent keys for storing and retrieving cards', async () => {
      // Arrange
      await repository.createSet('TEST', 'Test Set');

      // Act - Create a card
      const createdCard = await repository.createCard({
        name: 'Test Card',
        setKey: 'TEST',
        number: 1,
        rarity: Rarity.ONE_DIAMOND,
        boosterNames: [],
        isSixPackOnly: false,
      });

      // Act - Retrieve the same card
      const retrievedCard = await repository.retrieveCardByNumberAndSetKey(
        1,
        'TEST',
      );

      // Assert
      expect(retrievedCard).not.toBeNull();
      expect(retrievedCard?.id).toBe(createdCard.id);
      expect(retrievedCard?.name).toBe('Test Card');
      expect(retrievedCard?.number).toBe(1);
      expect(retrievedCard?.rarity).toBe(Rarity.ONE_DIAMOND);
    });

    it('should return null for non-existent cards', async () => {
      // Arrange
      await repository.createSet('TEST', 'Test Set');

      // Act
      const retrievedCard = await repository.retrieveCardByNumberAndSetKey(
        999,
        'TEST',
      );

      // Assert
      expect(retrievedCard).toBeNull();
    });

    it('should return null for cards in non-existent sets', async () => {
      // Act
      const retrievedCard = await repository.retrieveCardByNumberAndSetKey(
        1,
        'NONEXISTENT',
      );

      // Assert
      expect(retrievedCard).toBeNull();
    });
  });

  describe('reset functionality', () => {
    it('should clear all data when reset is called', async () => {
      // Arrange
      await repository.createSet('TEST', 'Test Set');
      await repository.createCard({
        name: 'Test Card',
        setKey: 'TEST',
        number: 1,
        rarity: Rarity.ONE_DIAMOND,
        boosterNames: [],
        isSixPackOnly: false,
      });

      // Act
      repository.reset();

      // Assert
      const retrievedCard = await repository.retrieveCardByNumberAndSetKey(
        1,
        'TEST',
      );
      expect(retrievedCard).toBeNull();
    });
  });
});
