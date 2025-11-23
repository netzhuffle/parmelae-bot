import { describe, beforeEach, it, afterEach, expect, spyOn } from 'bun:test';
import {
  PokemonTcgPocketService,
  RARITY_MAP,
  Sets,
  Card,
} from './PokemonTcgPocketService.js';
import { PokemonTcgPocketRepositoryFake } from './Fakes/PokemonTcgPocketRepositoryFake.js';
import {
  Rarity,
  OwnershipStatus,
  BoosterProbabilitiesType,
} from '../generated/prisma/enums.js';
import { PokemonTcgPocketProbabilityService } from './PokemonTcgPocketProbabilityService.js';
import { PokemonTcgPocketInvalidCardNumberError } from './Errors/PokemonTcgPocketInvalidCardNumberError.js';

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
        const setsData: Sets = {
          TEST: {
            name: 'Test Set',
            cards: {
              1: { name: 'Test Card', rarity: 'INVALID' },
            },
          },
        };
        const probabilityService = new PokemonTcgPocketProbabilityService();
        const service = new PokemonTcgPocketService(
          probabilityService,
          repository,
          setsData,
        );

        try {
          await service.synchronizeCardDatabaseWithYamlSource();
          expect.unreachable('Expected promise to reject');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Invalid rarity');
        }
      });

      it('accepts cards with all valid rarity symbols', async () => {
        const setsData: Sets = {
          TEST: {
            name: 'Test Set',
            cards: {
              1: { name: 'One Diamond', rarity: '♢' },
              2: { name: 'Two Diamonds', rarity: '♢♢' },
              3: { name: 'Three Diamonds', rarity: '♢♢♢' },
              4: { name: 'Four Diamonds', rarity: '♢♢♢♢' },
              5: { name: 'One Star', rarity: '☆' },
              6: { name: 'Two Stars', rarity: '☆☆' },
              7: { name: 'Three Stars', rarity: '☆☆☆' },
              8: { name: 'Four Stars', rarity: '☆☆☆☆' },
              9: { name: 'One Shiny', rarity: '✸' },
              10: { name: 'Two Shiny', rarity: '✸✸' },
              11: { name: 'Crown', rarity: '♛' },
              12: { name: 'No Rarity' },
            },
          },
        };
        const probabilityService = new PokemonTcgPocketProbabilityService();
        const service = new PokemonTcgPocketService(
          probabilityService,
          repository,
          setsData,
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
      it('rejects non-integer card numbers', async () => {
        // Create a Sets object with invalid card number by constructing it dynamically
        const invalidCards: Record<string, Card> = {
          'not-a-number': { name: 'Invalid Card', rarity: '♢' },
        };
        const setsData: Sets = {
          'TEST-SET': {
            name: 'Test Set',
            cards: invalidCards as Record<number, Card>,
          },
        };

        const probabilityService = new PokemonTcgPocketProbabilityService();
        const service = new PokemonTcgPocketService(
          probabilityService,
          repository,
          setsData,
        );

        try {
          await service.synchronizeCardDatabaseWithYamlSource();
          expect.unreachable(
            'Should have thrown PokemonTcgPocketInvalidCardNumberError',
          );
        } catch (error) {
          expect(error).toBeInstanceOf(PokemonTcgPocketInvalidCardNumberError);
          expect((error as Error).message).toContain('not-a-number');
        }
      });
    });

    describe('booster validation', () => {
      it('rejects cards referencing non-existent boosters', async () => {
        const setsData: Sets = {
          TEST: {
            name: 'Test Set',
            boosters: ['Booster1'],
            cards: {
              1: { name: 'Test Card', boosters: 'NonExistentBooster' },
            },
          },
        };
        const probabilityService = new PokemonTcgPocketProbabilityService();
        const service = new PokemonTcgPocketService(
          probabilityService,
          repository,
          setsData,
        );

        try {
          await service.synchronizeCardDatabaseWithYamlSource();
          expect.unreachable('Expected promise to reject');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain(
            'Card Test Card references non-existent boosters',
          );
        }
      });
    });

    describe('godPackBooster validation', () => {
      it('rejects non-crown cards with godPackBooster set', async () => {
        const setsData: Sets = {
          TEST: {
            name: 'Test Set',
            boosters: ['Booster1'],
            cards: {
              1: {
                name: 'Non-Crown Card',
                rarity: '♢♢♢♢',
                boosters: 'Booster1',
                godPackBooster: 'Booster1',
              },
            },
          },
        };
        const probabilityService = new PokemonTcgPocketProbabilityService();
        const service = new PokemonTcgPocketService(
          probabilityService,
          repository,
          setsData,
        );

        try {
          await service.synchronizeCardDatabaseWithYamlSource();
          expect.unreachable('Expected promise to reject');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain(
            'has godPackBooster but is not a crown card',
          );
        }
      });

      it('rejects crown cards with godPackBooster not in their boosters', async () => {
        const setsData: Sets = {
          TEST: {
            name: 'Test Set',
            boosters: ['Booster1', 'Booster2'],
            cards: {
              1: {
                name: 'Crown Card',
                rarity: '♛',
                boosters: 'Booster1',
                godPackBooster: 'Booster2',
              },
            },
          },
        };
        const probabilityService = new PokemonTcgPocketProbabilityService();
        const service = new PokemonTcgPocketService(
          probabilityService,
          repository,
          setsData,
        );

        try {
          await service.synchronizeCardDatabaseWithYamlSource();
          expect.unreachable('Expected promise to reject');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain("not in card's boosters");
        }
      });

      it('rejects cards with non-existent godPackBooster', async () => {
        const setsData: Sets = {
          TEST: {
            name: 'Test Set',
            boosters: ['Booster1'],
            cards: {
              1: {
                name: 'Crown Card',
                rarity: '♛',
                boosters: 'Booster1',
                godPackBooster: 'NonExistentBooster',
              },
            },
          },
        };
        const probabilityService = new PokemonTcgPocketProbabilityService();
        const service = new PokemonTcgPocketService(
          probabilityService,
          repository,
          setsData,
        );

        try {
          await service.synchronizeCardDatabaseWithYamlSource();
          expect.unreachable('Expected promise to reject');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain(
            'references non-existent godPackBooster',
          );
        }
      });

      it('rejects crown cards with godPackBooster when card is only in one booster', async () => {
        const setsData: Sets = {
          TEST: {
            name: 'Test Set',
            boosters: ['Booster1', 'Booster2'],
            cards: {
              1: {
                name: 'Crown Card',
                rarity: '♛',
                boosters: 'Booster1',
                godPackBooster: 'Booster1',
              },
            },
          },
        };
        const probabilityService = new PokemonTcgPocketProbabilityService();
        const service = new PokemonTcgPocketService(
          probabilityService,
          repository,
          setsData,
        );

        try {
          await service.synchronizeCardDatabaseWithYamlSource();
          expect.unreachable('Expected promise to reject');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('is only in one booster');
        }
      });

      it('accepts crown cards with valid godPackBooster', async () => {
        const setsData: Sets = {
          TEST: {
            name: 'Test Set',
            boosters: ['Booster1', 'Booster2'],
            cards: {
              1: {
                name: 'Crown Card',
                rarity: '♛',
                boosters: ['Booster1', 'Booster2'],
                godPackBooster: 'Booster1',
              },
            },
          },
        };
        const probabilityService = new PokemonTcgPocketProbabilityService();
        const service = new PokemonTcgPocketService(
          probabilityService,
          repository,
          setsData,
        );

        await service.synchronizeCardDatabaseWithYamlSource();

        const cards = repository.getAllCards();
        expect(cards).toHaveLength(1);
        expect(cards[0].name).toBe('Crown Card');
        expect(cards[0].godPackBoosterId).toBeDefined();
      });
    });
  });

  describe('Set configuration', () => {
    describe('single set', () => {
      it('creates default booster when no boosters are specified', async () => {
        const setsData: Sets = {
          TEST: {
            name: 'Test Set',
            cards: {
              1: { name: 'Test Card', rarity: '♢' },
            },
          },
        };
        const probabilityService = new PokemonTcgPocketProbabilityService();
        const service = new PokemonTcgPocketService(
          probabilityService,
          repository,
          setsData,
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
        const setsData: Sets = {
          TEST: {
            name: 'Test Set',
            boosters: null,
            cards: {
              1: { name: 'Card One', rarity: '♢' },
              2: { name: 'Card Two', rarity: '♢♢' },
            },
          },
        };
        const probabilityService = new PokemonTcgPocketProbabilityService();
        const service = new PokemonTcgPocketService(
          probabilityService,
          repository,
          setsData,
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
        const setsData: Sets = {
          TEST: {
            name: 'Test Set',
            boosters: ['Booster1', 'Booster2'],
            cards: {
              1: { name: 'Test Card 1', rarity: '♢', boosters: 'Booster1' },
              2: {
                name: 'Test Card 2',
                rarity: '♢♢',
                boosters: ['Booster1', 'Booster2'],
              },
            },
          },
        };
        const probabilityService = new PokemonTcgPocketProbabilityService();
        const service = new PokemonTcgPocketService(
          probabilityService,
          repository,
          setsData,
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
        const setsData: Sets = {
          SET1: {
            name: 'First Set',
            cards: {
              1: { name: 'First Set Card', rarity: '♢' },
            },
          },
          SET2: {
            name: 'Second Set',
            boosters: ['Booster1'],
            cards: {
              1: { name: 'Second Set Card', rarity: '♢♢' },
            },
          },
        };
        const probabilityService = new PokemonTcgPocketProbabilityService();
        const service = new PokemonTcgPocketService(
          probabilityService,
          repository,
          setsData,
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
      const setsData: Sets = {
        TEST: {
          name: 'Test Set',
          boosters: ['Booster1', 'Booster2', 'Booster3'],
          cards: {
            1: { name: 'Card In All Boosters', rarity: '♢' },
            2: {
              name: 'Card In Specific Booster',
              rarity: '♢',
              boosters: 'Booster1',
            },
          },
        },
      };
      const probabilityService = new PokemonTcgPocketProbabilityService();
      const service = new PokemonTcgPocketService(
        probabilityService,
        repository,
        setsData,
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

      // Verify all boosters have NO_SHINY_RARITY since there are no shiny cards
      const boosters = repository.getAllBoosters();
      boosters.forEach((booster) => {
        expect(booster.probabilitiesType).toBe(
          BoosterProbabilitiesType.NO_SHINY_RARITY,
        );
      });
    });

    it('handles cards with null boosters in a set with boosters', async () => {
      const setsData: Sets = {
        TEST: {
          name: 'Test Set',
          boosters: ['Booster1', 'Booster2'],
          cards: {
            1: {
              name: 'Card With Boosters',
              rarity: '♢',
              boosters: 'Booster1',
            },
            2: { name: 'Card Without Boosters', rarity: '♢', boosters: null },
          },
        },
      };
      const probabilityService = new PokemonTcgPocketProbabilityService();
      const service = new PokemonTcgPocketService(
        probabilityService,
        repository,
        setsData,
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

      // Verify all boosters have NO_SHINY_RARITY since there are no shiny cards
      const boosters = repository.getAllBoosters();
      boosters.forEach((booster) => {
        expect(booster.probabilitiesType).toBe(
          BoosterProbabilitiesType.NO_SHINY_RARITY,
        );
      });
    });
  });

  describe('Booster shiny rarity', () => {
    it('sets hasShinyRarity to true for boosters containing shiny cards', async () => {
      const setsData: Sets = {
        TEST: {
          name: 'Test Set',
          boosters: ['Booster1', 'Booster2'],
          cards: {
            1: { name: 'Regular Card', rarity: '♢', boosters: 'Booster1' },
            2: { name: 'Shiny Card', rarity: '✸', boosters: 'Booster2' },
            3: {
              name: 'Double Shiny Card',
              rarity: '✸✸',
              boosters: 'Booster2',
            },
          },
        },
      };
      const probabilityService = new PokemonTcgPocketProbabilityService();
      const service = new PokemonTcgPocketService(
        probabilityService,
        repository,
        setsData,
      );
      await service.synchronizeCardDatabaseWithYamlSource();

      // Verify cards were created
      const cards = repository.getAllCards();
      expect(cards).toHaveLength(3);

      // Get boosters
      const boosters = repository.getAllBoosters();
      expect(boosters).toHaveLength(2);

      // Verify Booster1 (no shiny cards) has NO_SHINY_RARITY
      const booster1 = boosters.find((b) => b.name === 'Booster1')!;
      expect(booster1.probabilitiesType).toBe(
        BoosterProbabilitiesType.NO_SHINY_RARITY,
      );

      // Verify Booster2 (with shiny cards) has DEFAULT
      const booster2 = boosters.find((b) => b.name === 'Booster2')!;
      expect(booster2.probabilitiesType).toBe(BoosterProbabilitiesType.DEFAULT);
    });

    it('sets hasShinyRarity to true for boosters containing shiny cards when cards are in multiple boosters', async () => {
      const setsData: Sets = {
        TEST: {
          name: 'Test Set',
          boosters: ['Booster1', 'Booster2', 'Booster3'],
          cards: {
            1: { name: 'Regular Card', rarity: '♢' },
            2: {
              name: 'Shiny Card',
              rarity: '✸',
              boosters: ['Booster1', 'Booster2'],
            },
            3: {
              name: 'Double Shiny Card',
              rarity: '✸✸',
              boosters: 'Booster2',
            },
          },
        },
      };
      const probabilityService = new PokemonTcgPocketProbabilityService();
      const service = new PokemonTcgPocketService(
        probabilityService,
        repository,
        setsData,
      );
      await service.synchronizeCardDatabaseWithYamlSource();

      // Verify cards were created
      const cards = repository.getAllCards();
      expect(cards).toHaveLength(3);

      // Get boosters
      const boosters = repository.getAllBoosters();
      expect(boosters).toHaveLength(3);

      // Verify Booster1 (with one shiny card) has DEFAULT
      const booster1 = boosters.find((b) => b.name === 'Booster1')!;
      expect(booster1.probabilitiesType).toBe(BoosterProbabilitiesType.DEFAULT);

      // Verify Booster2 (with two shiny cards) has DEFAULT
      const booster2 = boosters.find((b) => b.name === 'Booster2')!;
      expect(booster2.probabilitiesType).toBe(BoosterProbabilitiesType.DEFAULT);

      // Verify Booster3 (no shiny cards) has NO_SHINY_RARITY
      const booster3 = boosters.find((b) => b.name === 'Booster3')!;
      expect(booster3.probabilitiesType).toBe(
        BoosterProbabilitiesType.NO_SHINY_RARITY,
      );
    });
  });

  describe('Booster six-pack availability', () => {
    it('should set hasSixPacks to true for boosters containing six-pack-only cards', async () => {
      const setsData: Sets = {
        A1: {
          name: 'Test Set',
          boosters: ['Booster1', 'Booster2', 'Booster3'],
          cards: {
            1: {
              name: 'Regular Card',
              rarity: '♢',
              boosters: ['Booster1', 'Booster3'],
            },
            2: {
              name: 'Six Pack Only Card',
              rarity: '♢♢',
              isSixPackOnly: true,
              boosters: ['Booster1', 'Booster2'],
            },
            3: {
              name: 'Another Regular Card',
              rarity: '♢♢♢',
              boosters: 'Booster3',
            },
            4: {
              name: 'Shiny Card',
              rarity: '✸',
              boosters: ['Booster1', 'Booster2'],
            },
          },
        },
      };
      const probabilityService = new PokemonTcgPocketProbabilityService();
      const service = new PokemonTcgPocketService(
        probabilityService,
        repository,
        setsData,
      );
      await service.synchronizeCardDatabaseWithYamlSource();

      // Verify cards were created with correct isSixPackOnly values
      const cards = repository.getAllCards();
      expect(cards).toHaveLength(4);

      const regularCard = cards.find((c) => c.name === 'Regular Card')!;
      expect(regularCard.isSixPackOnly).toBe(false);

      const sixPackCard = cards.find((c) => c.name === 'Six Pack Only Card')!;
      expect(sixPackCard.isSixPackOnly).toBe(true);

      const anotherRegularCard = cards.find(
        (c) => c.name === 'Another Regular Card',
      )!;
      expect(anotherRegularCard.isSixPackOnly).toBe(false);

      // Get boosters
      const boosters = repository.getAllBoosters();
      expect(boosters).toHaveLength(3);

      // Verify Booster1 (contains six-pack card and shiny card) has POTENTIAL_SIXTH_CARD
      const booster1 = boosters.find((b) => b.name === 'Booster1')!;
      expect(booster1.probabilitiesType).toBe(
        BoosterProbabilitiesType.POTENTIAL_SIXTH_CARD,
      );

      // Verify Booster2 (contains six-pack card and shiny card) has POTENTIAL_SIXTH_CARD
      const booster2 = boosters.find((b) => b.name === 'Booster2')!;
      expect(booster2.probabilitiesType).toBe(
        BoosterProbabilitiesType.POTENTIAL_SIXTH_CARD,
      );

      // Verify Booster3 (no six-pack cards, no shiny cards) has NO_SHINY_RARITY
      const booster3 = boosters.find((b) => b.name === 'Booster3')!;
      expect(booster3.probabilitiesType).toBe(
        BoosterProbabilitiesType.NO_SHINY_RARITY,
      );
    });

    it('should set hasSixPacks to true for boosters containing six-pack-only cards when cards are in multiple boosters', async () => {
      const setsData: Sets = {
        A1: {
          name: 'Test Set',
          boosters: ['Booster1', 'Booster2'],
          cards: {
            1: { name: 'Regular Card', rarity: '♢' },
            2: {
              name: 'Six Pack Only Card',
              rarity: '♢♢',
              isSixPackOnly: true,
              boosters: 'Booster1',
            },
            3: {
              name: 'Another Six Pack Only Card',
              rarity: '♢♢♢',
              isSixPackOnly: true,
              boosters: 'Booster2',
            },
            4: {
              name: 'Shiny Card 1',
              rarity: '✸',
              boosters: 'Booster1',
            },
            5: {
              name: 'Shiny Card 2',
              rarity: '✸✸',
              boosters: 'Booster2',
            },
          },
        },
      };
      const probabilityService = new PokemonTcgPocketProbabilityService();
      const service = new PokemonTcgPocketService(
        probabilityService,
        repository,
        setsData,
      );
      await service.synchronizeCardDatabaseWithYamlSource();

      // Verify cards were created with correct isSixPackOnly values
      const cards = repository.getAllCards();
      expect(cards).toHaveLength(5);

      const regularCard = cards.find((c) => c.name === 'Regular Card')!;
      expect(regularCard.isSixPackOnly).toBe(false);

      const sixPackCard1 = cards.find((c) => c.name === 'Six Pack Only Card')!;
      expect(sixPackCard1.isSixPackOnly).toBe(true);

      const sixPackCard2 = cards.find(
        (c) => c.name === 'Another Six Pack Only Card',
      )!;
      expect(sixPackCard2.isSixPackOnly).toBe(true);

      // Get boosters
      const boosters = repository.getAllBoosters();
      expect(boosters).toHaveLength(2);

      // Both boosters should have POTENTIAL_SIXTH_CARD since they each contain a six-pack card and shiny card
      const booster1 = boosters.find((b) => b.name === 'Booster1')!;
      expect(booster1.probabilitiesType).toBe(
        BoosterProbabilitiesType.POTENTIAL_SIXTH_CARD,
      );

      const booster2 = boosters.find((b) => b.name === 'Booster2')!;
      expect(booster2.probabilitiesType).toBe(
        BoosterProbabilitiesType.POTENTIAL_SIXTH_CARD,
      );
    });

    it('should set hasSixPacks to false for all boosters when no six-pack-only cards exist', async () => {
      const setsData: Sets = {
        A1: {
          name: 'Test Set',
          boosters: ['Booster1', 'Booster2'],
          cards: {
            1: { name: 'Regular Card 1', rarity: '♢' },
            2: { name: 'Regular Card 2', rarity: '♢♢' },
            3: { name: 'Regular Card 3', rarity: '♢♢♢' },
          },
        },
      };
      const probabilityService = new PokemonTcgPocketProbabilityService();
      const service = new PokemonTcgPocketService(
        probabilityService,
        repository,
        setsData,
      );
      await service.synchronizeCardDatabaseWithYamlSource();

      // Verify all cards have isSixPackOnly false
      const cards = repository.getAllCards();
      expect(cards).toHaveLength(3);
      cards.forEach((card) => {
        expect(card.isSixPackOnly).toBe(false);
      });

      // Verify all boosters have NO_SHINY_RARITY since there are no shiny or six-pack cards
      const boosters = repository.getAllBoosters();
      expect(boosters).toHaveLength(2);
      boosters.forEach((booster) => {
        expect(booster.probabilitiesType).toBe(
          BoosterProbabilitiesType.NO_SHINY_RARITY,
        );
      });
    });
  });

  describe('searchCards smoke test', () => {
    // Smoke test for searchCards - full test suite is in pokemonCardSearchTool.test.ts
    it('should pass search criteria to repository', async () => {
      await repository.createSet('A1', 'Test Set');
      await repository.createBooster('Test Booster', 'A1');
      await repository.createCard({
        name: 'Pikachu',
        setKey: 'A1',
        number: 1,
        rarity: Rarity.ONE_DIAMOND,
        boosterNames: ['Test Booster'],
        isSixPackOnly: false,
      });
      await repository.createCard({
        name: 'Raichu',
        setKey: 'A1',
        number: 2,
        rarity: Rarity.TWO_DIAMONDS,
        boosterNames: ['Test Booster'],
        isSixPackOnly: false,
      });
      const probabilityService = new PokemonTcgPocketProbabilityService();
      const service = new PokemonTcgPocketService(
        probabilityService,
        repository,
        {} as Sets,
      );
      const searchCardsSpy = spyOn(repository, 'searchCards');

      const nameSearchCards = await service.searchCards({ cardName: 'chu' });

      expect(searchCardsSpy).toHaveBeenCalledWith({ cardName: 'chu' });
      expect(nameSearchCards).toHaveLength(2);
      expect(nameSearchCards[0].name).toBe('Pikachu');
      expect(nameSearchCards[1].name).toBe('Raichu');
    });
  });

  describe('formatSetStats', () => {
    it('should format set stats correctly', () => {
      const service = new PokemonTcgPocketService(
        new PokemonTcgPocketProbabilityService(),
        repository,
        {} as Sets,
      );

      // Test with all rarity types
      const stats = {
        diamonds: { cards: [], owned: 2, notNeeded: 0, total: 5 },
        stars: { cards: [], owned: 3, notNeeded: 0, total: 3 },
        shinies: { cards: [], owned: 1, notNeeded: 0, total: 2 },
        crowns: { cards: [], owned: 1, notNeeded: 0, total: 2 },
        promos: { cards: [], owned: 0, notNeeded: 0, total: 0 },
      };

      // eslint-disable-next-line @typescript-eslint/dot-notation
      const formatted = service['formatSetStats'](stats);
      expect(formatted).toEqual(['♦️ 2/5', '⭐️ 3', '✴️ 1', '👑 1']);
    });

    it('should not show stats for rarities with 0 owned cards', () => {
      const service = new PokemonTcgPocketService(
        new PokemonTcgPocketProbabilityService(),
        repository,
        {} as Sets,
      );

      // Test with some rarities having 0 owned cards
      const stats = {
        diamonds: { cards: [], owned: 2, notNeeded: 0, total: 5 },
        stars: { cards: [], owned: 0, notNeeded: 0, total: 3 },
        shinies: { cards: [], owned: 1, notNeeded: 0, total: 2 },
        crowns: { cards: [], owned: 0, notNeeded: 0, total: 2 },
        promos: { cards: [], owned: 0, notNeeded: 0, total: 0 },
      };

      // eslint-disable-next-line @typescript-eslint/dot-notation
      const formatted = service['formatSetStats'](stats);
      expect(formatted).toEqual(['♦️ 2/5', '✴️ 1']);
    });

    it('should show only promo count for sets without rarities', () => {
      const service = new PokemonTcgPocketService(
        new PokemonTcgPocketProbabilityService(),
        repository,
        {} as Sets,
      );

      // Test with only promo cards
      const stats = {
        diamonds: { cards: [], owned: 0, notNeeded: 0, total: 0 },
        stars: { cards: [], owned: 0, notNeeded: 0, total: 0 },
        shinies: { cards: [], owned: 0, notNeeded: 0, total: 0 },
        crowns: { cards: [], owned: 0, notNeeded: 0, total: 0 },
        promos: { cards: [], owned: 3, notNeeded: 0, total: 5 },
      };

      // eslint-disable-next-line @typescript-eslint/dot-notation
      const formatted = service['formatSetStats'](stats);
      expect(formatted).toEqual(['3']);
    });
  });

  describe('getCollectionStats with ownership status', () => {
    it('should exclude NOT_NEEDED cards from probability calculations', async () => {
      // Set up test data
      await repository.createSet('A1', 'Test Set');
      await repository.createBooster('Test Booster', 'A1');

      // Create 3 ONE_DIAMOND cards (guaranteed to appear in first 3 slots of normal packs)
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
        rarity: Rarity.ONE_DIAMOND,
        boosterNames: ['Test Booster'],
        isSixPackOnly: false,
      });
      await repository.createCard({
        name: 'Card 3',
        setKey: 'A1',
        number: 3,
        rarity: Rarity.ONE_DIAMOND,
        boosterNames: ['Test Booster'],
        isSixPackOnly: false,
      });

      const userId = BigInt(1);
      const cards = repository.getAllCards();

      // Add Card 1 as OWNED, Card 2 as NOT_NEEDED, leave Card 3 as missing
      await repository.addCardToCollection(
        cards[0].id,
        userId,
        OwnershipStatus.OWNED,
      );
      await repository.addCardToCollection(
        cards[1].id,
        userId,
        OwnershipStatus.NOT_NEEDED,
      );
      // Card 3 remains unowned (missing)

      const probabilityService = new PokemonTcgPocketProbabilityService();
      const service = new PokemonTcgPocketService(
        probabilityService,
        repository,
        {} as Sets,
      );

      const stats = await service.getCollectionStats(userId);

      // Verify that only Card 3 (the truly missing card) is considered for probability calculations
      expect(stats.boosters).toHaveLength(1);
      const boosterStats = stats.boosters[0];

      // Should show 1 owned (Card 1), total 3 cards
      expect(boosterStats.allOwned).toBe(1);
      expect(boosterStats.allTotal).toBe(3);

      // With 1 missing card out of 3 total, probability should be approximately 70.335%
      expect(boosterStats.newCardProbability).toBeCloseTo(70.335, 1);
      expect(boosterStats.newCardProbability).toBeGreaterThan(70);
      expect(boosterStats.newCardProbability).toBeLessThan(71);
    });

    it('should return 0% probability when all cards are owned or not needed', async () => {
      // Set up test data
      await repository.createSet('A1', 'Test Set');
      await repository.createBooster('Test Booster', 'A1');

      // Create 2 cards
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
        rarity: Rarity.ONE_DIAMOND,
        boosterNames: ['Test Booster'],
        isSixPackOnly: false,
      });

      const userId = BigInt(1);
      const cards = repository.getAllCards();

      // Add Card 1 as OWNED, Card 2 as NOT_NEEDED (no missing cards)
      await repository.addCardToCollection(
        cards[0].id,
        userId,
        OwnershipStatus.OWNED,
      );
      await repository.addCardToCollection(
        cards[1].id,
        userId,
        OwnershipStatus.NOT_NEEDED,
      );

      const probabilityService = new PokemonTcgPocketProbabilityService();
      const service = new PokemonTcgPocketService(
        probabilityService,
        repository,
        {} as Sets,
      );

      const stats = await service.getCollectionStats(userId);

      expect(stats.boosters).toHaveLength(1);
      const boosterStats = stats.boosters[0];

      // Should show 1 owned (Card 1), total 2 cards
      expect(boosterStats.allOwned).toBe(1);
      expect(boosterStats.allTotal).toBe(2);

      // Probability should be exactly 0 since no cards are truly missing
      expect(boosterStats.newCardProbability).toBe(0);
    });
  });

  describe('getCollectionStats booster sorting', () => {
    it('should sort boosters by newCardProbability in descending order', async () => {
      // Set up test data with multiple boosters having different probabilities
      await repository.createSet('A1', 'Test Set');
      await repository.createBooster('High Prob Booster', 'A1');
      await repository.createBooster('Low Prob Booster', 'A1');
      await repository.createBooster('Zero Prob Booster', 'A1');

      // Create cards for each booster with different ownership patterns
      // High Prob Booster: 1 missing card out of 2
      await repository.createCard({
        name: 'High Prob Card 1',
        setKey: 'A1',
        number: 1,
        rarity: Rarity.ONE_DIAMOND,
        boosterNames: ['High Prob Booster'],
        isSixPackOnly: false,
      });
      await repository.createCard({
        name: 'High Prob Card 2',
        setKey: 'A1',
        number: 2,
        rarity: Rarity.ONE_DIAMOND,
        boosterNames: ['High Prob Booster'],
        isSixPackOnly: false,
      });

      // Low Prob Booster: 1 missing card out of 3 (lower probability)
      await repository.createCard({
        name: 'Low Prob Card 1',
        setKey: 'A1',
        number: 3,
        rarity: Rarity.ONE_DIAMOND,
        boosterNames: ['Low Prob Booster'],
        isSixPackOnly: false,
      });
      await repository.createCard({
        name: 'Low Prob Card 2',
        setKey: 'A1',
        number: 4,
        rarity: Rarity.ONE_DIAMOND,
        boosterNames: ['Low Prob Booster'],
        isSixPackOnly: false,
      });
      await repository.createCard({
        name: 'Low Prob Card 3',
        setKey: 'A1',
        number: 5,
        rarity: Rarity.ONE_DIAMOND,
        boosterNames: ['Low Prob Booster'],
        isSixPackOnly: false,
      });

      // Zero Prob Booster: all cards owned
      await repository.createCard({
        name: 'Zero Prob Card 1',
        setKey: 'A1',
        number: 6,
        rarity: Rarity.ONE_DIAMOND,
        boosterNames: ['Zero Prob Booster'],
        isSixPackOnly: false,
      });

      const userId = BigInt(1);
      const cards = repository.getAllCards();

      // Set up ownership to create different probabilities
      // High Prob: own 1 out of 2 (higher probability of new card)
      await repository.addCardToCollection(
        cards[0].id,
        userId,
        OwnershipStatus.OWNED,
      );
      // card[1] remains missing

      // Low Prob: own 2 out of 3 (lower probability of new card)
      await repository.addCardToCollection(
        cards[2].id,
        userId,
        OwnershipStatus.OWNED,
      );
      await repository.addCardToCollection(
        cards[3].id,
        userId,
        OwnershipStatus.OWNED,
      );
      // card[4] remains missing

      // Zero Prob: own all cards (0% probability)
      await repository.addCardToCollection(
        cards[5].id,
        userId,
        OwnershipStatus.OWNED,
      );

      const probabilityService = new PokemonTcgPocketProbabilityService();
      const service = new PokemonTcgPocketService(
        probabilityService,
        repository,
        {} as Sets,
      );

      const stats = await service.getCollectionStats(userId);

      expect(stats.boosters).toHaveLength(3);

      // Verify boosters are sorted by newCardProbability in descending order
      expect(stats.boosters[0].name).toBe('High Prob Booster');
      expect(stats.boosters[1].name).toBe('Low Prob Booster');
      expect(stats.boosters[2].name).toBe('Zero Prob Booster');

      // Verify actual probabilities are in descending order
      expect(stats.boosters[0].newCardProbability).toBeGreaterThan(
        stats.boosters[1].newCardProbability,
      );
      expect(stats.boosters[1].newCardProbability).toBeGreaterThan(
        stats.boosters[2].newCardProbability,
      );
      expect(stats.boosters[2].newCardProbability).toBe(0);
    });
  });

  describe('Foil rarity detection and FOUR_CARDS_WITH_GUARANTEED_EX', () => {
    let service: PokemonTcgPocketService;
    let probabilityService: PokemonTcgPocketProbabilityService;

    beforeEach(async () => {
      probabilityService = new PokemonTcgPocketProbabilityService();

      // Create a test set with foil cards
      const testSets: Sets = {
        TEST: {
          name: 'Test Set with Foil Cards',
          boosters: ['Test Booster'],
          cards: {
            1: { name: 'Regular Card', rarity: '♢' },
            2: { name: 'Foil Card 1', rarity: '♢✦' },
            3: { name: 'Foil Card 2', rarity: '♢♢✦' },
            4: { name: 'Foil Card 3', rarity: '♢♢♢✦' },
            5: { name: 'EX Card', rarity: '♢♢♢♢' },
          },
        },
      };

      service = new PokemonTcgPocketService(
        probabilityService,
        repository,
        testSets,
      );

      await service.synchronizeCardDatabaseWithYamlSource();
    });

    it('should detect foil rarities and set FOUR_CARDS_WITH_GUARANTEED_EX', async () => {
      const booster = await repository.retrieveBoosterByNameAndSetKey(
        'Test Booster',
        'TEST',
      );

      expect(booster).toBeDefined();
      expect(booster?.probabilitiesType).toBe(
        BoosterProbabilitiesType.FOUR_CARDS_WITH_GUARANTEED_EX,
      );
    });

    it('should create cards with foil rarities correctly', async () => {
      // Check individual cards
      const foilCard1 = await repository.retrieveCardByNumberAndSetKey(
        2,
        'TEST',
      );
      const foilCard2 = await repository.retrieveCardByNumberAndSetKey(
        3,
        'TEST',
      );
      const foilCard3 = await repository.retrieveCardByNumberAndSetKey(
        4,
        'TEST',
      );

      expect(foilCard1?.rarity).toBe(Rarity.ONE_DIAMOND_FOIL);
      expect(foilCard2?.rarity).toBe(Rarity.TWO_DIAMONDS_FOIL);
      expect(foilCard3?.rarity).toBe(Rarity.THREE_DIAMONDS_FOIL);
    });

    it('should handle mixed boosters with and without foil cards', async () => {
      const mixedSets: Sets = {
        MIXED: {
          name: 'Mixed Set',
          boosters: ['Regular Booster', 'Foil Booster'],
          cards: {
            1: {
              name: 'Regular Card',
              rarity: '♢',
              boosters: 'Regular Booster',
            },
            2: { name: 'Shiny Card', rarity: '✸', boosters: 'Regular Booster' },
            3: { name: 'Foil Card', rarity: '♢✦', boosters: 'Foil Booster' },
            4: {
              name: 'EX Card',
              rarity: '♢♢♢♢',
              boosters: ['Regular Booster', 'Foil Booster'],
            },
          },
        },
      };

      const mixedService = new PokemonTcgPocketService(
        probabilityService,
        repository,
        mixedSets,
      );

      await mixedService.synchronizeCardDatabaseWithYamlSource();

      const regularBooster = await repository.retrieveBoosterByNameAndSetKey(
        'Regular Booster',
        'MIXED',
      );
      const foilBooster = await repository.retrieveBoosterByNameAndSetKey(
        'Foil Booster',
        'MIXED',
      );

      expect(regularBooster?.probabilitiesType).toBe(
        BoosterProbabilitiesType.DEFAULT,
      );
      expect(foilBooster?.probabilitiesType).toBe(
        BoosterProbabilitiesType.FOUR_CARDS_WITH_GUARANTEED_EX,
      );
    });

    it('should prioritize foil over six-pack when both are present', async () => {
      const mixedSets = {
        MIXED: {
          name: 'Mixed Set',
          boosters: ['Mixed Booster'],
          cards: {
            1: {
              name: 'Foil Card',
              rarity: '♢✦',
              boosters: 'Mixed Booster',
            },
            2: {
              name: 'Six Pack Card',
              rarity: '♢♢♢',
              boosters: 'Mixed Booster',
              isSixPackOnly: true,
            },
          },
        },
      };

      const mixedService = new PokemonTcgPocketService(
        probabilityService,
        repository,
        mixedSets,
      );

      await mixedService.synchronizeCardDatabaseWithYamlSource();

      const booster = await repository.retrieveBoosterByNameAndSetKey(
        'Mixed Booster',
        'MIXED',
      );

      expect(booster?.probabilitiesType).toBe(
        BoosterProbabilitiesType.FOUR_CARDS_WITH_GUARANTEED_EX,
      );
    });

    it('should prioritize foil over shiny when both are present', async () => {
      const mixedSets = {
        MIXED: {
          name: 'Mixed Set',
          boosters: ['Mixed Booster'],
          cards: {
            1: {
              name: 'Foil Card',
              rarity: '♢♢✦',
              boosters: 'Mixed Booster',
            },
            2: {
              name: 'Shiny Card',
              rarity: '✸',
              boosters: 'Mixed Booster',
            },
          },
        },
      };

      const mixedService = new PokemonTcgPocketService(
        probabilityService,
        repository,
        mixedSets,
      );

      await mixedService.synchronizeCardDatabaseWithYamlSource();

      const booster = await repository.retrieveBoosterByNameAndSetKey(
        'Mixed Booster',
        'MIXED',
      );

      expect(booster?.probabilitiesType).toBe(
        BoosterProbabilitiesType.FOUR_CARDS_WITH_GUARANTEED_EX,
      );
    });

    it('should correctly map foil rarity symbols in RARITY_MAP', () => {
      // Test that the RARITY_MAP correctly maps foil symbols to enum values
      expect(RARITY_MAP['♢✦']).toBe(Rarity.ONE_DIAMOND_FOIL);
      expect(RARITY_MAP['♢♢✦']).toBe(Rarity.TWO_DIAMONDS_FOIL);
      expect(RARITY_MAP['♢♢♢✦']).toBe(Rarity.THREE_DIAMONDS_FOIL);
    });
  });

  describe('formatCardsAsCsv', () => {
    let service: PokemonTcgPocketService;

    beforeEach(() => {
      repository = new PokemonTcgPocketRepositoryFake();
      const probabilityService = new PokemonTcgPocketProbabilityService();
      const setsData: Sets = {
        TEST: {
          name: 'Test Set',
          cards: {
            1: { name: 'Test Card', rarity: '♢' },
          },
        },
      };
      service = new PokemonTcgPocketService(
        probabilityService,
        repository,
        setsData,
      );

      // Setup repository with test data for probability calculations
      repository.countByBoosterAndRarityReturnValue = 10; // Default count
      repository.countGodPackEligibleByBoosterReturnValue = 0; // No god pack by default
    });

    it('should include Probability column in correct position', async () => {
      // Create the set first
      await repository.createSet('TEST', 'Test Set');
      await repository.createBooster('Test Booster', 'TEST');
      await repository.createCard({
        name: 'Test Card',
        setKey: 'TEST',
        number: 1,
        rarity: Rarity.ONE_DIAMOND,
        boosterNames: ['Test Booster'],
        isSixPackOnly: false,
      });

      // Get cards with relations using searchCards
      const cardsWithRelations = await repository.searchCards({
        cardName: 'Test Card',
      });

      const csv = await service.formatCardsAsCsv(cardsWithRelations);
      const lines = csv.split('\n');
      const header = lines[0];

      expect(header).toBe(
        'ID,Name,Rarity,Set,Boosters,Probability,SixPackOnly,Owned by Owned',
      );
    });

    it('should format probability as percentage with 2 decimals', async () => {
      // Create the set first
      await repository.createSet('TEST', 'Test Set');
      await repository.createBooster('Test Booster', 'TEST');
      await repository.createCard({
        name: 'Test Card 2',
        setKey: 'TEST',
        number: 2,
        rarity: Rarity.ONE_DIAMOND,
        boosterNames: ['Test Booster'],
        isSixPackOnly: false,
      });

      const cardsWithRelations = await repository.searchCards({
        cardName: 'Test Card 2',
      });
      const csv = await service.formatCardsAsCsv(cardsWithRelations);
      const lines = csv.split('\n');
      const dataLine = lines[1];
      const columns = dataLine.split(',');
      const probabilityColumn = columns[5]; // 6th column (0-indexed)

      // Should be a percentage string with 2 decimal places
      expect(probabilityColumn).toMatch(/^\d+\.\d{2}%$/);
    });
  });
});
