import { PokemonTcgPocketService } from './PokemonTcgPocketService.js';
import { PokemonTcgPocketRepositoryFake } from './Fakes/PokemonTcgPocketRepositoryFake.js';
import { Rarity } from '@prisma/client';
import { PokemonTcgPocketProbabilityService } from './PokemonTcgPocketProbabilityService.js';

describe('PokemonTcgPocketService', () => {
  let repository: PokemonTcgPocketRepositoryFake;

  beforeEach(() => {
    repository = new PokemonTcgPocketRepositoryFake();
  });

  afterEach(() => {
    repository.clear();
  });

  describe('YAML validation', () => {
    describe('rarity validation', () => {
      it('rejects cards with invalid rarity symbols', async () => {
        const yaml = `
TEST:
  name: Test Set
  cards:
    1:
      name: Test Card
      rarity: INVALID
`;
        const probabilityService = new PokemonTcgPocketProbabilityService();
        const service = new PokemonTcgPocketService(
          probabilityService,
          repository,
          yaml,
        );

        await expect(
          service.synchronizeCardDatabaseWithYamlSource(),
        ).rejects.toThrow('Invalid rarity');
      });

      it('accepts cards with all valid rarity symbols', async () => {
        const yaml = `
TEST:
  name: Test Set
  cards:
    1:
      name: One Diamond
      rarity: ♢
    2:
      name: Two Diamonds
      rarity: ♢♢
    3:
      name: Three Diamonds
      rarity: ♢♢♢
    4:
      name: Four Diamonds
      rarity: ♢♢♢♢
    5:
      name: One Star
      rarity: ☆
    6:
      name: Two Stars
      rarity: ☆☆
    7:
      name: Three Stars
      rarity: ☆☆☆
    8:
      name: Four Stars
      rarity: ☆☆☆☆
    9:
      name: One Shiny
      rarity: ✸
    10:
      name: Two Shiny
      rarity: ✸✸
    11:
      name: Crown
      rarity: ♛
    12:
      name: No Rarity
`;
        const probabilityService = new PokemonTcgPocketProbabilityService();
        const service = new PokemonTcgPocketService(
          probabilityService,
          repository,
          yaml,
        );
        await service.synchronizeCardDatabaseWithYamlSource();

        // Verify all cards were created with correct rarities
        const cards = repository.getAllCards();
        expect(cards).toHaveLength(12);

        const rarityMap = new Map(cards.map((c) => [c.name, c.rarity]));
        expect(rarityMap.get('One Diamond')).toBe(Rarity.ONE_DIAMOND);
        expect(rarityMap.get('Two Diamonds')).toBe(Rarity.TWO_DIAMONDS);
        expect(rarityMap.get('Three Diamonds')).toBe(Rarity.THREE_DIAMONDS);
        expect(rarityMap.get('Four Diamonds')).toBe(Rarity.FOUR_DIAMONDS);
        expect(rarityMap.get('One Star')).toBe(Rarity.ONE_STAR);
        expect(rarityMap.get('Two Stars')).toBe(Rarity.TWO_STARS);
        expect(rarityMap.get('Three Stars')).toBe(Rarity.THREE_STARS);
        expect(rarityMap.get('Four Stars')).toBe(Rarity.FOUR_STARS);
        expect(rarityMap.get('One Shiny')).toBe(Rarity.ONE_SHINY);
        expect(rarityMap.get('Two Shiny')).toBe(Rarity.TWO_SHINY);
        expect(rarityMap.get('Crown')).toBe(Rarity.CROWN);
        expect(rarityMap.get('No Rarity')).toBeNull();
      });
    });

    describe('card number validation', () => {
      it('rejects duplicate card numbers within a set', async () => {
        const yaml = `
TEST-SET:
  name: Test Set
  cards:
    1:
      name: Card One
      rarity: ♢
    1:
      name: Another Card One
      rarity: ♢`;

        const probabilityService = new PokemonTcgPocketProbabilityService();
        const service = new PokemonTcgPocketService(
          probabilityService,
          repository,
          yaml,
        );

        await expect(
          service.synchronizeCardDatabaseWithYamlSource(),
        ).rejects.toThrow('duplicated mapping key');
      });

      it('rejects non-integer card numbers', async () => {
        const yaml = `
TEST:
  name: Test Set
  cards:
    abc:
      name: Invalid Number Card
      rarity: ♢
`;
        const probabilityService = new PokemonTcgPocketProbabilityService();
        const service = new PokemonTcgPocketService(
          probabilityService,
          repository,
          yaml,
        );

        await expect(
          service.synchronizeCardDatabaseWithYamlSource(),
        ).rejects.toThrow('Invalid card number');
      });
    });

    describe('booster validation', () => {
      it('rejects cards referencing non-existent boosters', async () => {
        const yaml = `
TEST:
  name: Test Set
  boosters:
    - Booster1
  cards:
    1:
      name: Test Card
      boosters: NonExistentBooster
`;
        const probabilityService = new PokemonTcgPocketProbabilityService();
        const service = new PokemonTcgPocketService(
          probabilityService,
          repository,
          yaml,
        );

        await expect(
          service.synchronizeCardDatabaseWithYamlSource(),
        ).rejects.toThrow('Card Test Card references non-existent boosters');
      });
    });
  });

  describe('Set configuration', () => {
    describe('single set', () => {
      it('creates default booster when no boosters are specified', async () => {
        const yaml = `
TEST:
  name: Test Set
  cards:
    1:
      name: Test Card
      rarity: ♢
`;
        const probabilityService = new PokemonTcgPocketProbabilityService();
        const service = new PokemonTcgPocketService(
          probabilityService,
          repository,
          yaml,
        );
        await service.synchronizeCardDatabaseWithYamlSource();

        // Verify set was created
        const sets = repository.getAllSets();
        expect(sets).toHaveLength(1);
        expect(sets[0].name).toBe('Test Set');

        // Verify default booster was created
        const boosters = repository.getAllBoosters();
        expect(boosters).toHaveLength(1);
        expect(boosters[0].name).toBe('Test Set');

        // Verify card was created and assigned to default booster
        const cards = repository.getAllCards();
        expect(cards).toHaveLength(1);
        expect(cards[0].name).toBe('Test Card');

        const cardBoosters = repository.getCardBoosters(cards[0].id);
        expect(cardBoosters).toHaveLength(1);
        expect(cardBoosters[0].name).toBe('Test Set');
      });

      it('creates no boosters when boosters is null', async () => {
        const yaml = `
TEST:
  name: Test Set
  boosters: ~
  cards:
    1:
      name: Card One
      rarity: ♢
    2:
      name: Card Two
      rarity: ♢♢
`;
        const probabilityService = new PokemonTcgPocketProbabilityService();
        const service = new PokemonTcgPocketService(
          probabilityService,
          repository,
          yaml,
        );
        await service.synchronizeCardDatabaseWithYamlSource();

        // Verify set was created
        const sets = repository.getAllSets();
        expect(sets).toHaveLength(1);

        // Verify no boosters were created
        const boosters = repository.getAllBoosters();
        expect(boosters).toHaveLength(0);

        // Verify cards exist but have no boosters
        const cards = repository.getAllCards();
        expect(cards).toHaveLength(2);
        for (const card of cards) {
          const cardBoosters = repository.getCardBoosters(card.id);
          expect(cardBoosters).toHaveLength(0);
        }
      });

      it('creates specified boosters and assigns cards correctly', async () => {
        const yaml = `
TEST:
  name: Test Set
  boosters:
    - Booster1
    - Booster2
  cards:
    1:
      name: Test Card 1
      rarity: ♢
      boosters: Booster1
    2:
      name: Test Card 2
      rarity: ♢♢
      boosters: 
        - Booster1
        - Booster2
`;
        const probabilityService = new PokemonTcgPocketProbabilityService();
        const service = new PokemonTcgPocketService(
          probabilityService,
          repository,
          yaml,
        );
        await service.synchronizeCardDatabaseWithYamlSource();

        // Verify set was created
        const sets = repository.getAllSets();
        expect(sets).toHaveLength(1);

        // Verify boosters were created
        const boosters = repository.getAllBoosters();
        expect(boosters).toHaveLength(2);
        expect(boosters.map((b) => b.name).sort()).toEqual([
          'Booster1',
          'Booster2',
        ]);

        // Verify cards were created
        const cards = repository.getAllCards();
        expect(cards).toHaveLength(2);

        // Verify first card is only in Booster1
        const card1 = cards.find((c) => c.name === 'Test Card 1')!;
        const card1Boosters = repository.getCardBoosters(card1.id);
        expect(card1Boosters).toHaveLength(1);
        expect(card1Boosters[0].name).toBe('Booster1');

        // Verify second card is in both boosters
        const card2 = cards.find((c) => c.name === 'Test Card 2')!;
        const card2Boosters = repository.getCardBoosters(card2.id);
        expect(card2Boosters).toHaveLength(2);
        expect(card2Boosters.map((b) => b.name).sort()).toEqual([
          'Booster1',
          'Booster2',
        ]);
      });
    });

    describe('multiple sets', () => {
      it('handles multiple sets with different booster configurations', async () => {
        const yaml = `
SET1:
  name: First Set
  cards:
    1:
      name: First Set Card
      rarity: ♢
SET2:
  name: Second Set
  boosters:
    - Booster1
  cards:
    1:
      name: Second Set Card
      rarity: ♢♢
`;
        const probabilityService = new PokemonTcgPocketProbabilityService();
        const service = new PokemonTcgPocketService(
          probabilityService,
          repository,
          yaml,
        );
        await service.synchronizeCardDatabaseWithYamlSource();

        // Verify sets were created
        const sets = repository.getAllSets();
        expect(sets).toHaveLength(2);
        expect(sets.map((s) => s.name).sort()).toEqual([
          'First Set',
          'Second Set',
        ]);

        // Verify first set has default booster
        const set1 = sets.find((s) => s.name === 'First Set')!;
        const set1Boosters = repository
          .getAllBoosters()
          .filter((b) => b.setId === set1.id);
        expect(set1Boosters).toHaveLength(1);
        expect(set1Boosters[0].name).toBe('First Set');

        // Verify second set has specified booster
        const set2 = sets.find((s) => s.name === 'Second Set')!;
        const set2Boosters = repository
          .getAllBoosters()
          .filter((b) => b.setId === set2.id);
        expect(set2Boosters).toHaveLength(1);
        expect(set2Boosters[0].name).toBe('Booster1');

        // Verify cards were created in correct sets
        const cards = repository.getAllCards();
        expect(cards).toHaveLength(2);

        // Verify first set card
        const set1Card = cards.find((c) => c.name === 'First Set Card')!;
        expect(set1Card.setId).toBe(set1.id);
        const set1CardBoosters = repository.getCardBoosters(set1Card.id);
        expect(set1CardBoosters).toHaveLength(1);
        expect(set1CardBoosters[0].name).toBe('First Set');

        // Verify second set card
        const set2Card = cards.find((c) => c.name === 'Second Set Card')!;
        expect(set2Card.setId).toBe(set2.id);
        const set2CardBoosters = repository.getCardBoosters(set2Card.id);
        expect(set2CardBoosters).toHaveLength(1);
        expect(set2CardBoosters[0].name).toBe('Booster1');
      });
    });
  });

  describe('Card booster assignment', () => {
    it('assigns cards to all boosters when no boosters specified', async () => {
      const yaml = `
TEST:
  name: Test Set
  boosters:
    - Booster1
    - Booster2
    - Booster3
  cards:
    1:
      name: Card In All Boosters
      rarity: ♢
    2:
      name: Card In Specific Booster
      rarity: ♢
      boosters: Booster1
`;
      const probabilityService = new PokemonTcgPocketProbabilityService();
      const service = new PokemonTcgPocketService(
        probabilityService,
        repository,
        yaml,
      );
      await service.synchronizeCardDatabaseWithYamlSource();

      // Verify cards were created
      const cards = repository.getAllCards();
      expect(cards).toHaveLength(2);

      // Verify card without specified boosters is in all boosters
      const cardInAll = cards.find((c) => c.name === 'Card In All Boosters')!;
      const cardInAllBoosters = repository.getCardBoosters(cardInAll.id);
      expect(cardInAllBoosters).toHaveLength(3);
      expect(cardInAllBoosters.map((b) => b.name).sort()).toEqual([
        'Booster1',
        'Booster2',
        'Booster3',
      ]);

      // Verify card with specified booster is only in that booster
      const cardInOne = cards.find(
        (c) => c.name === 'Card In Specific Booster',
      )!;
      const cardInOneBoosters = repository.getCardBoosters(cardInOne.id);
      expect(cardInOneBoosters).toHaveLength(1);
      expect(cardInOneBoosters[0].name).toBe('Booster1');

      // Verify all boosters have hasShinyRarity set to false since there are no shiny cards
      const boosters = repository.getAllBoosters();
      boosters.forEach((booster) => {
        expect(booster.hasShinyRarity).toBe(false);
      });
    });

    it('handles cards with null boosters in a set with boosters', async () => {
      const yaml = `
TEST:
  name: Test Set
  boosters:
    - Booster1
    - Booster2
  cards:
    1:
      name: Card With Boosters
      rarity: ♢
      boosters: Booster1
    2:
      name: Card Without Boosters
      rarity: ♢
      boosters: ~
`;
      const probabilityService = new PokemonTcgPocketProbabilityService();
      const service = new PokemonTcgPocketService(
        probabilityService,
        repository,
        yaml,
      );
      await service.synchronizeCardDatabaseWithYamlSource();

      // Verify cards were created
      const cards = repository.getAllCards();
      expect(cards).toHaveLength(2);

      // Verify card with boosters is in specified booster
      const cardWithBoosters = cards.find(
        (c) => c.name === 'Card With Boosters',
      )!;
      const cardWithBoostersBoosters = repository.getCardBoosters(
        cardWithBoosters.id,
      );
      expect(cardWithBoostersBoosters).toHaveLength(1);
      expect(cardWithBoostersBoosters[0].name).toBe('Booster1');

      // Verify card with null boosters has no boosters
      const cardWithoutBoosters = cards.find(
        (c) => c.name === 'Card Without Boosters',
      )!;
      const cardWithoutBoostersBoosters = repository.getCardBoosters(
        cardWithoutBoosters.id,
      );
      expect(cardWithoutBoostersBoosters).toHaveLength(0);

      // Verify all boosters have hasShinyRarity set to false since there are no shiny cards
      const boosters = repository.getAllBoosters();
      boosters.forEach((booster) => {
        expect(booster.hasShinyRarity).toBe(false);
      });
    });
  });

  describe('Booster shiny rarity', () => {
    it('sets hasShinyRarity to true for boosters containing shiny cards', async () => {
      const yaml = `
TEST:
  name: Test Set
  boosters:
    - Booster1
    - Booster2
  cards:
    1:
      name: Regular Card
      rarity: ♢
      boosters: Booster1
    2:
      name: Shiny Card
      rarity: ✸
      boosters: Booster2
    3:
      name: Double Shiny Card
      rarity: ✸✸
      boosters: Booster2
`;
      const probabilityService = new PokemonTcgPocketProbabilityService();
      const service = new PokemonTcgPocketService(
        probabilityService,
        repository,
        yaml,
      );
      await service.synchronizeCardDatabaseWithYamlSource();

      // Verify cards were created
      const cards = repository.getAllCards();
      expect(cards).toHaveLength(3);

      // Get boosters
      const boosters = repository.getAllBoosters();
      expect(boosters).toHaveLength(2);

      // Verify Booster1 (no shiny cards) has hasShinyRarity false
      const booster1 = boosters.find((b) => b.name === 'Booster1')!;
      expect(booster1.hasShinyRarity).toBe(false);

      // Verify Booster2 (with shiny cards) has hasShinyRarity true
      const booster2 = boosters.find((b) => b.name === 'Booster2')!;
      expect(booster2.hasShinyRarity).toBe(true);
    });

    it('sets hasShinyRarity to true for boosters containing shiny cards when cards are in multiple boosters', async () => {
      const yaml = `
TEST:
  name: Test Set
  boosters:
    - Booster1
    - Booster2
    - Booster3
  cards:
    1:
      name: Regular Card
      rarity: ♢
    2:
      name: Shiny Card
      rarity: ✸
      boosters:
        - Booster1
        - Booster2
    3:
      name: Double Shiny Card
      rarity: ✸✸
      boosters: Booster2
`;
      const probabilityService = new PokemonTcgPocketProbabilityService();
      const service = new PokemonTcgPocketService(
        probabilityService,
        repository,
        yaml,
      );
      await service.synchronizeCardDatabaseWithYamlSource();

      // Verify cards were created
      const cards = repository.getAllCards();
      expect(cards).toHaveLength(3);

      // Get boosters
      const boosters = repository.getAllBoosters();
      expect(boosters).toHaveLength(3);

      // Verify Booster1 (with one shiny card) has hasShinyRarity true
      const booster1 = boosters.find((b) => b.name === 'Booster1')!;
      expect(booster1.hasShinyRarity).toBe(true);

      // Verify Booster2 (with two shiny cards) has hasShinyRarity true
      const booster2 = boosters.find((b) => b.name === 'Booster2')!;
      expect(booster2.hasShinyRarity).toBe(true);

      // Verify Booster3 (no shiny cards) has hasShinyRarity false
      const booster3 = boosters.find((b) => b.name === 'Booster3')!;
      expect(booster3.hasShinyRarity).toBe(false);
    });
  });

  describe('searchCards smoke test', () => {
    // Smoke test for searchCards - full test suite is in pokemonCardSearchTool.test.ts
    it('should pass search criteria to repository', async () => {
      await repository.createSet('A1', 'Test Set');
      await repository.createBooster('Test Booster', 'A1');
      await repository.createCard('Pikachu', 'A1', 1, Rarity.ONE_DIAMOND, [
        'Test Booster',
      ]);
      await repository.createCard('Raichu', 'A1', 2, Rarity.TWO_DIAMONDS, [
        'Test Booster',
      ]);
      const probabilityService = new PokemonTcgPocketProbabilityService();
      const service = new PokemonTcgPocketService(
        probabilityService,
        repository,
        '',
      );
      const searchCardsSpy = jest.spyOn(repository, 'searchCards');

      const nameSearchCards = await service.searchCards({ cardName: 'chu' });

      expect(searchCardsSpy).toHaveBeenCalledWith({ cardName: 'chu' });
      expect(nameSearchCards).toHaveLength(2);
      expect(nameSearchCards[0].name).toBe('Pikachu');
      expect(nameSearchCards[1].name).toBe('Raichu');
    });
  });
});
