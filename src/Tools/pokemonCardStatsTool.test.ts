import { PokemonTcgPocketService } from '../PokemonTcgPocket/PokemonTcgPocketService.js';
import { PokemonTcgPocketRepositoryFake } from '../PokemonTcgPocket/Fakes/PokemonTcgPocketRepositoryFake.js';
import { Rarity } from '@prisma/client';
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
      // Crown cards (total: 2)
      await repository.createCard('Card 9', 'A1', 9, Rarity.CROWN, []);
      await repository.createCard('Card 10', 'A1', 10, Rarity.CROWN, []);

      // Add some cards to collection
      const cards = await repository.searchCards({ setKey: 'A1' });
      // Add 2 diamond cards
      await repository.addCardToCollection(cards[0].id, BigInt(1));
      await repository.addCardToCollection(cards[1].id, BigInt(1));
      // Add 3 star cards
      await repository.addCardToCollection(cards[5].id, BigInt(1));
      await repository.addCardToCollection(cards[6].id, BigInt(1));
      await repository.addCardToCollection(cards[7].id, BigInt(1));
      // Add 1 crown card
      await repository.addCardToCollection(cards[8].id, BigInt(1));

      const result = (await pokemonCardStatsTool.invoke({}, config)) as string;
      expect(result).toContain('@test1’s collection:');
      expect(result).toContain('Sets:');
      expect(result).toContain('Unschlagbare Gene: ♦️ 2/5 ⋅ ⭐️ 3 ⋅ 👑 1');
    });

    it('should show correct format for promo sets without rarities', async () => {
      await repository.createSet('PA', 'Promo-A');
      await repository.createCard('Promo 1', 'PA', 1, null, []);
      await repository.createCard('Promo 2', 'PA', 2, null, []);
      await repository.createCard('Promo 3', 'PA', 3, null, []);

      // Add one promo card to collection
      const cards = await repository.searchCards({ setKey: 'PA' });
      await repository.addCardToCollection(cards[0].id, BigInt(1));

      const result = (await pokemonCardStatsTool.invoke({}, config)) as string;
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

      // Create cards in Mewtu booster
      await repository.createCard('Card 3', 'A1', 3, Rarity.ONE_STAR, [
        'Mewtu',
      ]);
      await repository.createCard('Card 4', 'A1', 4, Rarity.TWO_STARS, [
        'Mewtu',
      ]);

      // Add some cards to collection
      const cards = await repository.searchCards({ setKey: 'A1' });
      await repository.addCardToCollection(cards[0].id, BigInt(1));
      await repository.addCardToCollection(cards[2].id, BigInt(1));

      const result = (await pokemonCardStatsTool.invoke({}, config)) as string;
      expect(result).toContain('Packs:');
      expect(result).toMatch(/Glurak: 1\/2 ⋅ p♢ \d+\.\d+ % ⋅ pN \d+\.\d+ %/);
      expect(result).toMatch(/Mewtu: 1\/2 ⋅ p♢ \d+\.\d+ % ⋅ pN \d+\.\d+ %/);
      expect(result).toContain('p♢ is the probability');
      expect(result).toContain('pN is the probability');
    });

    it('should include explanation texts', async () => {
      await repository.createSet('A1', 'Test Set');

      const result = (await pokemonCardStatsTool.invoke({}, config)) as string;
      expect(result).toContain('♦️ is');
      expect(result).toContain('rarities ♢, ♢♢, ♢♢♢, and ♢♢♢♢');
      expect(result).toContain('⭐️ is');
      expect(result).toContain('rarities ☆, ☆☆, and ☆☆☆');
      expect(result).toContain('👑 is');
      expect(result).toContain('rarity ♛');
      expect(result).toContain('Promo sets');
      expect(result).toContain('collected and total');
      expect(result).toContain('probability');
    });

    it('should include search tool name in explanation', async () => {
      await repository.createSet('A1', 'Test Set');

      const result = (await pokemonCardStatsTool.invoke({}, config)) as string;
      expect(result).toContain('run the pokemonCardSearch tool');
    });
  });

  describe('user display', () => {
    beforeEach(async () => {
      await repository.createSet('A1', 'Test Set');
    });

    it('should show username when available', async () => {
      const result = (await pokemonCardStatsTool.invoke({}, config)) as string;
      expect(result).toContain('@test1’s collection:');
    });

    it('should show first name when username not available', async () => {
      config.configurable.userId = BigInt(2);

      const result = (await pokemonCardStatsTool.invoke({}, config)) as string;
      expect(result).toContain('Test2’s collection:');
    });
  });
});
