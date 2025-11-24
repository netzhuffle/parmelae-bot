import { describe, beforeEach, it, afterEach, expect } from 'bun:test';
import {
  PokemonTcgPocketService,
  Sets,
} from '../PokemonTcgPocket/PokemonTcgPocketService.js';
import { PokemonTcgPocketRepositoryFake } from '../PokemonTcgPocket/Fakes/PokemonTcgPocketRepositoryFake.js';
import { Rarity, OwnershipStatus } from '../generated/prisma/enums.js';
import { pokemonCardStatsTool } from './pokemonCardStatsTool.js';
import { createTestToolConfig, ToolContext } from '../ChatGptAgentService.js';
import { PokemonTcgPocketProbabilityService } from '../PokemonTcgPocket/PokemonTcgPocketProbabilityService.js';
import { FiveCardsWithoutShinyStrategy } from '../PokemonTcgPocket/PackProbabilityStrategies/FiveCardsWithoutShinyStrategy.js';
import { FiveCardsStrategy } from '../PokemonTcgPocket/PackProbabilityStrategies/FiveCardsStrategy.js';
import { BabyAsPotentialSixthCardStrategy } from '../PokemonTcgPocket/PackProbabilityStrategies/BabyAsPotentialSixthCardStrategy.js';
import { FourCardGuaranteedExStrategy } from '../PokemonTcgPocket/PackProbabilityStrategies/FourCardGuaranteedExStrategy.js';

describe('pokemonCardStats', () => {
  let repository: PokemonTcgPocketRepositoryFake;
  let config: { configurable: ToolContext };
  beforeEach(() => {
    repository = new PokemonTcgPocketRepositoryFake();
    config = createTestToolConfig({
      userId: BigInt(1),
      pokemonTcgPocketService: new PokemonTcgPocketService(
        new PokemonTcgPocketProbabilityService(
          new FiveCardsWithoutShinyStrategy(),
          new FiveCardsStrategy(),
          new BabyAsPotentialSixthCardStrategy(),
          new FourCardGuaranteedExStrategy(),
        ),
        repository,
        {} as Sets,
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
        rarity: Rarity.TWO_DIAMONDS,
        boosterNames: [],
        isSixPackOnly: false,
      });
      await repository.createCard({
        name: 'Card 4',
        setKey: 'A1',
        number: 4,
        rarity: Rarity.THREE_DIAMONDS,
        boosterNames: [],
        isSixPackOnly: false,
      });
      await repository.createCard({
        name: 'Card 5',
        setKey: 'A1',
        number: 5,
        rarity: Rarity.THREE_DIAMONDS,
        boosterNames: [],
        isSixPackOnly: false,
      });
      // Star cards (total: 3)
      await repository.createCard({
        name: 'Card 6',
        setKey: 'A1',
        number: 6,
        rarity: Rarity.ONE_STAR,
        boosterNames: [],
        isSixPackOnly: false,
      });
      await repository.createCard({
        name: 'Card 7',
        setKey: 'A1',
        number: 7,
        rarity: Rarity.TWO_STARS,
        boosterNames: [],
        isSixPackOnly: false,
      });
      await repository.createCard({
        name: 'Card 8',
        setKey: 'A1',
        number: 8,
        rarity: Rarity.TWO_STARS,
        boosterNames: [],
        isSixPackOnly: false,
      });
      // Shiny cards (total: 2)
      await repository.createCard({
        name: 'Card 9',
        setKey: 'A1',
        number: 9,
        rarity: Rarity.ONE_SHINY,
        boosterNames: [],
        isSixPackOnly: false,
      });
      await repository.createCard({
        name: 'Card 10',
        setKey: 'A1',
        number: 10,
        rarity: Rarity.TWO_SHINY,
        boosterNames: [],
        isSixPackOnly: false,
      });
      // Crown cards (total: 2)
      await repository.createCard({
        name: 'Card 11',
        setKey: 'A1',
        number: 11,
        rarity: Rarity.CROWN,
        boosterNames: [],
        isSixPackOnly: false,
      });
      await repository.createCard({
        name: 'Card 12',
        setKey: 'A1',
        number: 12,
        rarity: Rarity.CROWN,
        boosterNames: [],
        isSixPackOnly: false,
      });

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
      await repository.createCard({
        name: 'Promo 1',
        setKey: 'PA',
        number: 1,
        rarity: null,
        boosterNames: [],
        isSixPackOnly: false,
      });
      await repository.createCard({
        name: 'Promo 2',
        setKey: 'PA',
        number: 2,
        rarity: null,
        boosterNames: [],
        isSixPackOnly: false,
      });
      await repository.createCard({
        name: 'Promo 3',
        setKey: 'PA',
        number: 3,
        rarity: null,
        boosterNames: [],
        isSixPackOnly: false,
      });

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
      await repository.createCard({
        name: 'Card 1',
        setKey: 'A1',
        number: 1,
        rarity: Rarity.ONE_DIAMOND,
        boosterNames: ['Glurak'],
        isSixPackOnly: false,
      });
      await repository.createCard({
        name: 'Card 2',
        setKey: 'A1',
        number: 2,
        rarity: Rarity.TWO_DIAMONDS,
        boosterNames: ['Glurak'],
        isSixPackOnly: false,
      });
      await repository.createCard({
        name: 'Card 3',
        setKey: 'A1',
        number: 3,
        rarity: Rarity.ONE_STAR,
        boosterNames: ['Glurak'],
        isSixPackOnly: false,
      });

      // Create cards in Mewtu booster
      await repository.createCard({
        name: 'Card 4',
        setKey: 'A1',
        number: 4,
        rarity: Rarity.ONE_STAR,
        boosterNames: ['Mewtu'],
        isSixPackOnly: false,
      });
      await repository.createCard({
        name: 'Card 5',
        setKey: 'A1',
        number: 5,
        rarity: Rarity.TWO_STARS,
        boosterNames: ['Mewtu'],
        isSixPackOnly: false,
      });

      // Add some cards to collection
      const cards = await repository.searchCards({ setKey: 'A1' });
      await repository.addCardToCollection(cards[0].id, BigInt(1));
      await repository.addCardToCollection(cards[2].id, BigInt(1));
      await repository.addCardToCollection(cards[3].id, BigInt(1));

      const result = await pokemonCardStatsTool.invoke({}, config);
      expect(result).toContain('Booster Packs');
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
      await repository.createCard({
        name: 'Card 1',
        setKey: 'A1',
        number: 1,
        rarity: Rarity.ONE_DIAMOND,
        boosterNames: ['Test Booster'],
        isSixPackOnly: false,
      });
      await repository.createCard({
        name: 'Card 2',
        setKey: 'A1',
        number: 2,
        rarity: Rarity.TWO_DIAMONDS,
        boosterNames: ['Test Booster'],
        isSixPackOnly: false,
      });
      await repository.createCard({
        name: 'Card 3',
        setKey: 'A1',
        number: 3,
        rarity: Rarity.THREE_DIAMONDS,
        boosterNames: ['Test Booster'],
        isSixPackOnly: false,
      });
      await repository.createCard({
        name: 'Card 4',
        setKey: 'A1',
        number: 4,
        rarity: Rarity.ONE_STAR,
        boosterNames: ['Test Booster'],
        isSixPackOnly: false,
      });
      await repository.createCard({
        name: 'Card 5',
        setKey: 'A1',
        number: 5,
        rarity: Rarity.TWO_STARS,
        boosterNames: ['Test Booster'],
        isSixPackOnly: false,
      });

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
