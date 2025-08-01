import { describe, beforeEach, it, afterEach, expect } from 'bun:test';
import { PokemonTcgPocketService } from '../PokemonTcgPocket/PokemonTcgPocketService.js';
import { PokemonTcgPocketRepositoryFake } from '../PokemonTcgPocket/Fakes/PokemonTcgPocketRepositoryFake.js';
import { Rarity, OwnershipStatus } from '@prisma/client';
import { pokemonCardStatsTool } from './pokemonCardStatsTool.js';
import { createTestToolConfig, ToolContext } from '../ChatGptAgentService.js';
import { PokemonTcgPocketProbabilityService } from '../PokemonTcgPocket/PokemonTcgPocketProbabilityService.js';

describe('pokemonCardStats', () => {
  let repository: PokemonTcgPocketRepositoryFake;
  let config: { configurable: ToolContext };
  beforeEach(() => {
    repository = new PokemonTcgPocketRepositoryFake();
    config = createTestToolConfig({
      userId: BigInt(1),
      pokemonTcgPocketService: new PokemonTcgPocketService(
        new PokemonTcgPocketProbabilityService(),
        repository,
        '',
      ),
    });
  });

  afterEach(() => {
    repository.clear();
  });

  describe('output format', () => {
    it('should show correct format for sets with all rarity types', async () => {
      // Create a set with all rarity types
      await repository.createSet('A1', 'Unschlagbare Gene');
      // Diamond cards (total: 5)
      await repository.createCard('Card 1', 'A1', 1, Rarity.ONE_DIAMOND, []);
      await repository.createCard('Card 2', 'A1', 2, Rarity.TWO_DIAMONDS, []);
      await repository.createCard('Card 3', 'A1', 3, Rarity.TWO_DIAMONDS, []);
      await repository.createCard('Card 4', 'A1', 4, Rarity.THREE_DIAMONDS, []);
      await repository.createCard('Card 5', 'A1', 5, Rarity.THREE_DIAMONDS, []);
      // Star cards (total: 3)
      await repository.createCard('Card 6', 'A1', 6, Rarity.ONE_STAR, []);
      await repository.createCard('Card 7', 'A1', 7, Rarity.TWO_STARS, []);
      await repository.createCard('Card 8', 'A1', 8, Rarity.TWO_STARS, []);
      // Shiny cards (total: 2)
      await repository.createCard('Card 9', 'A1', 9, Rarity.ONE_SHINY, []);
      await repository.createCard('Card 10', 'A1', 10, Rarity.TWO_SHINY, []);
      // Crown cards (total: 2)
      await repository.createCard('Card 11', 'A1', 11, Rarity.CROWN, []);
      await repository.createCard('Card 12', 'A1', 12, Rarity.CROWN, []);

      // Add some cards to collection
      const cards = await repository.searchCards({ setKey: 'A1' });
      // Add 2 diamond cards
      await repository.addCardToCollection(cards[0].id, BigInt(1));
      await repository.addCardToCollection(cards[1].id, BigInt(1));
      // Add 3 star cards
      await repository.addCardToCollection(cards[5].id, BigInt(1));
      await repository.addCardToCollection(cards[6].id, BigInt(1));
      await repository.addCardToCollection(cards[7].id, BigInt(1));
      // Add 1 shiny card
      await repository.addCardToCollection(cards[8].id, BigInt(1));
      // Add 1 crown card
      await repository.addCardToCollection(cards[10].id, BigInt(1));

      const result = await pokemonCardStatsTool.invoke({}, config);
      expect(result).toContain('Sets:');
      expect(result).toContain(
        'Unschlagbare Gene: ♦️ 2/5 ⋅ ⭐️ 3 ⋅ ✴️ 1 ⋅ 👑 1',
      );
    });

    it('should show correct format for promo sets without rarities', async () => {
      await repository.createSet('PA', 'Promo-A');
      await repository.createCard('Promo 1', 'PA', 1, null, []);
      await repository.createCard('Promo 2', 'PA', 2, null, []);
      await repository.createCard('Promo 3', 'PA', 3, null, []);

      // Add one promo card to collection
      const cards = await repository.searchCards({ setKey: 'PA' });
      await repository.addCardToCollection(cards[0].id, BigInt(1));

      const result = await pokemonCardStatsTool.invoke({}, config);
      expect(result).toContain('Promo-A: 1');
      expect(result).toContain('Promo sets don’t have rarities');
    });

    it('should show correct format for boosters', async () => {
      await repository.createSet('A1', 'Test Set');
      await repository.createBooster('Glurak', 'A1');
      await repository.createBooster('Mewtu', 'A1');

      // Create cards in Glurak booster
      await repository.createCard('Card 1', 'A1', 1, Rarity.ONE_DIAMOND, [
        'Glurak',
      ]);
      await repository.createCard('Card 2', 'A1', 2, Rarity.TWO_DIAMONDS, [
        'Glurak',
      ]);
      await repository.createCard('Card 3', 'A1', 3, Rarity.ONE_STAR, [
        'Glurak',
      ]);

      // Create cards in Mewtu booster
      await repository.createCard('Card 4', 'A1', 4, Rarity.ONE_STAR, [
        'Mewtu',
      ]);
      await repository.createCard('Card 5', 'A1', 5, Rarity.TWO_STARS, [
        'Mewtu',
      ]);

      // Add some cards to collection
      const cards = await repository.searchCards({ setKey: 'A1' });
      await repository.addCardToCollection(cards[0].id, BigInt(1));
      await repository.addCardToCollection(cards[2].id, BigInt(1));
      await repository.addCardToCollection(cards[3].id, BigInt(1));

      const result = await pokemonCardStatsTool.invoke({}, config);
      expect(result).toContain('Booster Packs:');
      expect(result).toMatch(
        /Glurak: ♢–♢♢♢♢ 1\/2 ⋅ p\d+\.\d+% \| ♢–☆ 2\/3 ⋅ p\d+\.\d+% \| ♢–♛ 2\/3 ⋅ p\d+\.\d+%/,
      );
      expect(result).toMatch(
        /Mewtu: ♢–♢♢♢♢ 0\/0 ⋅ p\d+\.\d+% \| ♢–☆ 1\/1 ⋅ p\d+\.\d+% \| ♢–♛ 1\/2 ⋅ p\d+\.\d+%/,
      );
      expect(result).toContain('♢–♢♢♢♢ shows progress and probability');
      expect(result).toContain('♢–☆ shows progress and probability');
      expect(result).toContain('♢–♛ shows overall progress and probability');
    });

    it('should include explanation texts', async () => {
      await repository.createSet('A1', 'Test Set');

      const result = await pokemonCardStatsTool.invoke({}, config);
      expect(result).toContain('♦️ is');
      expect(result).toContain('rarities ♢, ♢♢, ♢♢♢, and ♢♢♢♢');
      expect(result).toContain('⭐️ is');
      expect(result).toContain('rarities ☆, ☆☆, and ☆☆☆');
      expect(result).toContain('✴️ for rarities ✸ and ✸✸');
      expect(result).toContain('👑 for rarity ♛');
      expect(result).toContain('Promo sets');
      expect(result).toContain('collected and total');
      expect(result).toContain('probability');
    });

    it('should include search tool name in explanation', async () => {
      await repository.createSet('A1', 'Test Set');

      const result = await pokemonCardStatsTool.invoke({}, config);
      expect(result).toContain('run the pokemonCardSearch tool');
    });

    it('should show correct format with NOT_NEEDED cards', async () => {
      // Create a set with mixed ownership statuses
      await repository.createSet('A1', 'Test Set');
      await repository.createBooster('Test Booster', 'A1');

      // Create cards
      await repository.createCard('Card 1', 'A1', 1, Rarity.ONE_DIAMOND, [
        'Test Booster',
      ]);
      await repository.createCard('Card 2', 'A1', 2, Rarity.TWO_DIAMONDS, [
        'Test Booster',
      ]);
      await repository.createCard('Card 3', 'A1', 3, Rarity.THREE_DIAMONDS, [
        'Test Booster',
      ]);
      await repository.createCard('Card 4', 'A1', 4, Rarity.ONE_STAR, [
        'Test Booster',
      ]);
      await repository.createCard('Card 5', 'A1', 5, Rarity.TWO_STARS, [
        'Test Booster',
      ]);

      const cards = await repository.searchCards({ setKey: 'A1' });

      // Add cards with different ownership statuses
      await repository.addCardToCollection(
        cards[0].id,
        BigInt(1),
        OwnershipStatus.OWNED,
      );
      await repository.addCardToCollection(
        cards[1].id,
        BigInt(1),
        OwnershipStatus.NOT_NEEDED,
      );
      await repository.addCardToCollection(
        cards[3].id,
        BigInt(1),
        OwnershipStatus.OWNED,
      );
      await repository.addCardToCollection(
        cards[4].id,
        BigInt(1),
        OwnershipStatus.NOT_NEEDED,
      );
      // Card 3 (index 2) remains missing

      const result = await pokemonCardStatsTool.invoke({}, config);

      // Check set statistics: 1 owned + 1 not needed / 3 total diamonds, 1 owned + 1 not needed stars (no total shown)
      expect(result).toContain('Test Set: ♦️ 1+1/3 ⋅ ⭐️ 1+1');

      // Check booster statistics
      expect(result).toMatch(
        /Test Booster: ♢–♢♢♢♢ 1\+1\/3 ⋅ p\d+\.\d+% \| ♢–☆ 2\+1\/4 ⋅ p\d+\.\d+% \| ♢–♛ 2\+2\/5 ⋅ p\d+\.\d+%/,
      );
    });
  });

  describe('user display', () => {
    beforeEach(async () => {
      await repository.createSet('A1', 'Test Set');
    });

    it('should show username when available', async () => {
      const result = await pokemonCardStatsTool.invoke({}, config);
      expect(result).toContain('@test1’s collection:');
    });

    it('should show first name when username not available', async () => {
      config.configurable.userId = BigInt(2);

      const result = await pokemonCardStatsTool.invoke({}, config);
      expect(result).toContain('Test2’s collection:');
    });
  });
});
