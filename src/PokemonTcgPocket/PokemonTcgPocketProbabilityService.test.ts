import { describe, it, beforeEach, expect } from 'bun:test';
import { PokemonCardModel } from '../generated/prisma/models/PokemonCard.js';
import { PokemonSetModel } from '../generated/prisma/models/PokemonSet.js';
import { Rarity } from '../generated/prisma/enums.js';
import { PokemonTcgPocketProbabilityService } from './PokemonTcgPocketProbabilityService.js';
import { PACK_CONFIG } from './PokemonTcgPocketProbabilityService.js';
import { PokemonCardWithRelations } from './Repositories/Types.js';

/** Set of rarities that can appear in god packs */
const GOD_PACK_RARITIES = new Set<Rarity>([
  Rarity.ONE_STAR,
  Rarity.TWO_STARS,
  Rarity.THREE_STARS,
  Rarity.CROWN,
]);

describe('PokemonTcgPocketProbabilityService', () => {
  let service: PokemonTcgPocketProbabilityService;

  beforeEach(() => {
    service = new PokemonTcgPocketProbabilityService();
  });

  describe('Normal booster probabilities', () => {
    it('should calculate correct probabilities for normal boosters', () => {
      // Create a test booster with one card of each rarity
      const boosterCards: PokemonCardModel[] = [
        createCard(Rarity.TWO_DIAMONDS),
        createCard(Rarity.THREE_DIAMONDS),
        createCard(Rarity.FOUR_DIAMONDS),
        createCard(Rarity.ONE_STAR),
        createCard(Rarity.TWO_STARS),
        createCard(Rarity.THREE_STARS),
        createCard(Rarity.CROWN),
      ];

      // All cards are missing
      const missingCards = [...boosterCards];

      const probability = service.calculateNewCardProbability(
        boosterCards,
        missingCards,
        false, // hasShinyRarity = false
      );

      // The probability should be very close to 1 since all cards are missing
      expect(probability).toBeCloseTo(1.0, 5);
    });

    it('should handle diamond card probabilities correctly', () => {
      const boosterCards: PokemonCardModel[] = [
        createCard(Rarity.TWO_DIAMONDS),
        createCard(Rarity.THREE_DIAMONDS),
        createCard(Rarity.FOUR_DIAMONDS),
      ];

      const missingCards = [...boosterCards];

      const probability = service.calculateNewDiamondCardProbability(
        boosterCards,
        missingCards,
        false, // hasShinyRarity = false
      );

      // The probability should be high since all diamond cards are missing
      expect(probability).toBeGreaterThan(0.99);
    });
  });

  describe('Shiny booster probabilities', () => {
    it('should calculate correct probabilities for shiny boosters', () => {
      // Create a test booster with one card of each rarity including shinies
      const boosterCards: PokemonCardModel[] = [
        createCard(Rarity.TWO_DIAMONDS),
        createCard(Rarity.THREE_DIAMONDS),
        createCard(Rarity.FOUR_DIAMONDS),
        createCard(Rarity.ONE_STAR),
        createCard(Rarity.TWO_STARS),
        createCard(Rarity.THREE_STARS),
        createCard(Rarity.ONE_SHINY),
        createCard(Rarity.TWO_SHINY),
        createCard(Rarity.CROWN),
      ];

      // All cards are missing
      const missingCards = [...boosterCards];

      const probability = service.calculateNewCardProbability(
        boosterCards,
        missingCards,
        true, // hasShinyRarity = true
      );

      // The probability should be very close to 1 since all cards are missing
      expect(probability).toBeCloseTo(1.0, 5);
    });

    it('should calculate combined probability (including god pack) when shiny and all god pack cards are missing', () => {
      const boosterCards: PokemonCardModel[] = [
        createCard(Rarity.ONE_STAR),
        createCard(Rarity.TWO_STARS),
        createCard(Rarity.THREE_STARS),
        createCard(Rarity.ONE_SHINY),
        createCard(Rarity.TWO_SHINY),
        createCard(Rarity.CROWN),
      ];

      const missingCards = [...boosterCards];

      const probability = service.calculateNewCardProbability(
        boosterCards,
        missingCards,
        true, // hasShinyRarity = true
      );

      // The combined probability should account for normal and god packs, resulting in a value above 0.2
      expect(probability).toBeGreaterThan(0.2);
    });
  });

  describe('God pack branch (isolated via config)', () => {
    it('should return 1 when forcing all packs to be god packs and all god pack cards are missing', () => {
      const boosterCards: PokemonCardModel[] = [
        createCard(Rarity.ONE_STAR),
        createCard(Rarity.TWO_STARS),
        createCard(Rarity.THREE_STARS),
        createCard(Rarity.ONE_SHINY),
        createCard(Rarity.TWO_SHINY),
        createCard(Rarity.CROWN),
      ];
      const missingCards = [...boosterCards];
      // Monkey-patch PACK_CONFIG to force god packs only and restore afterwards
      const originalNormal = PACK_CONFIG.NORMAL_PACK_PROBABILITY;
      const originalGod = PACK_CONFIG.GOD_PACK_PROBABILITY;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        (PACK_CONFIG as any).NORMAL_PACK_PROBABILITY = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        (PACK_CONFIG as any).GOD_PACK_PROBABILITY = 1;
        const probability = service.calculateNewCardProbability(
          boosterCards,
          missingCards,
          true, // hasShinyRarity = true
        );
        // Expect full probability when only god packs are used
        expect(probability).toBeCloseTo(1.0, 5);
      } finally {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        (PACK_CONFIG as any).NORMAL_PACK_PROBABILITY = originalNormal;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        (PACK_CONFIG as any).GOD_PACK_PROBABILITY = originalGod;
      }
    });
  });

  describe('Edge cases', () => {
    it('should return 0 when there are no booster cards', () => {
      const probability = service.calculateNewCardProbability(
        [],
        [],
        false, // hasShinyRarity = false
      );

      expect(probability).toBe(0);
    });

    it('should return 0 when there are no missing cards', () => {
      const boosterCards: PokemonCardModel[] = [
        createCard(Rarity.TWO_DIAMONDS),
        createCard(Rarity.THREE_DIAMONDS),
      ];

      const probability = service.calculateNewCardProbability(
        boosterCards,
        [],
        false, // hasShinyRarity = false
      );

      expect(probability).toBe(0);
    });

    it('should handle mixed booster types correctly', () => {
      // Create a booster with both normal and shiny cards
      const boosterCards: PokemonCardModel[] = [
        createCard(Rarity.TWO_DIAMONDS),
        createCard(Rarity.ONE_SHINY),
      ];

      const missingCards = [...boosterCards];

      // Test with hasShinyRarity = false
      const normalProbability = service.calculateNewCardProbability(
        boosterCards,
        missingCards,
        false, // hasShinyRarity = false
      );

      // Test with hasShinyRarity = true
      const shinyProbability = service.calculateNewCardProbability(
        boosterCards,
        missingCards,
        true, // hasShinyRarity = true
      );

      // The probabilities should be different since the distributions are different
      expect(normalProbability).not.toBe(shinyProbability);
    });
  });

  describe('calculateNewCardProbability', () => {
    it('should return 0 when no cards are missing', () => {
      const boosterCards = createTestCards();
      const missingCards: PokemonCardModel[] = [];

      const probability = service.calculateNewCardProbability(
        boosterCards,
        missingCards,
        false, // hasShinyRarity = false
      );

      expect(probability).toBe(0);
    });

    it('should return 1 when all cards are missing and there are cards of every rarity', () => {
      const boosterCards = createTestCards();
      const missingCards = [...boosterCards];

      const probability = service.calculateNewCardProbability(
        boosterCards,
        missingCards,
        false, // hasShinyRarity = false
      );

      expect(probability).toBeGreaterThan(0.99);
    });

    it('should handle missing only ONE_DIAMOND cards', () => {
      const boosterCards = createTestCards();
      const missingCards = boosterCards.filter(
        (card) => card.rarity === Rarity.ONE_DIAMOND,
      );

      const probability = service.calculateNewCardProbability(
        boosterCards,
        missingCards,
        false, // hasShinyRarity = false
      );

      // First 3 slots are ONE_DIAMOND, so probability should be high
      expect(probability).toBeGreaterThan(0.9);
    });

    it('should handle missing only god pack cards', () => {
      const boosterCards = createTestCards();
      const missingCards = boosterCards.filter(
        (card) => card.rarity !== null && GOD_PACK_RARITIES.has(card.rarity),
      );

      const probability = service.calculateNewCardProbability(
        boosterCards,
        missingCards,
        false, // hasShinyRarity = false
      );

      // God pack probability is 0.05%, plus some chance from normal packs
      expect(probability).toBeGreaterThan(0.0005);
      expect(probability).toBeLessThan(0.2);
    });

    it('should handle missing shiny cards', () => {
      const boosterCards = createTestCards();
      const missingCards = boosterCards.filter(
        (card) =>
          card.rarity === Rarity.ONE_SHINY || card.rarity === Rarity.TWO_SHINY,
      );

      const probability = service.calculateNewCardProbability(
        boosterCards,
        missingCards,
        true, // hasShinyRarity = true
      );

      // Probabilities should be non-zero for shiny boosters
      expect(probability).toBeGreaterThan(0);
    });

    it('should handle empty booster', () => {
      const boosterCards: PokemonCardModel[] = [];
      const missingCards: PokemonCardModel[] = [];

      const probability = service.calculateNewCardProbability(
        boosterCards,
        missingCards,
        false, // hasShinyRarity = false
      );

      expect(probability).toBe(0);
    });
  });

  describe('calculateNewDiamondCardProbability', () => {
    it('should handle missing only diamond cards', () => {
      const boosterCards = createTestCards();
      const missingCards = boosterCards.filter(
        (card) =>
          card.rarity === Rarity.ONE_DIAMOND ||
          card.rarity === Rarity.TWO_DIAMONDS ||
          card.rarity === Rarity.THREE_DIAMONDS ||
          card.rarity === Rarity.FOUR_DIAMONDS,
      );

      const probability = service.calculateNewDiamondCardProbability(
        boosterCards,
        missingCards,
        false, // hasShinyRarity = false
      );

      // First 3 slots are ONE_DIAMOND, and slots 4 and 5 have high diamond probabilities
      expect(probability).toBeGreaterThan(0.9);
    });

    it('should return 0 for diamond probability when no diamond cards are missing', () => {
      const boosterCards = createTestCards();
      const missingCards = boosterCards.filter(
        (card) =>
          card.rarity === Rarity.ONE_STAR ||
          card.rarity === Rarity.TWO_STARS ||
          card.rarity === Rarity.THREE_STARS ||
          card.rarity === Rarity.CROWN,
      );

      const probability = service.calculateNewDiamondCardProbability(
        boosterCards,
        missingCards,
        false, // hasShinyRarity = false
      );

      expect(probability).toBe(0);
    });

    it('should handle empty booster for diamond probability', () => {
      const boosterCards: PokemonCardModel[] = [];
      const missingCards: PokemonCardModel[] = [];

      const probability = service.calculateNewDiamondCardProbability(
        boosterCards,
        missingCards,
        false, // hasShinyRarity = false
      );

      expect(probability).toBe(0);
    });
  });

  describe('calculateNewTradableCardProbability', () => {
    it('should return 0 when no cards are missing', () => {
      const boosterCards = [
        {
          id: 1,
          name: 'Test Card ONE_DIAMOND',
          setId: 1,
          number: 1,
          rarity: Rarity.ONE_DIAMOND,
          isSixPackOnly: false,
        },
        {
          id: 2,
          name: 'Test Card ONE_STAR',
          setId: 1,
          number: 2,
          rarity: Rarity.ONE_STAR,
          isSixPackOnly: false,
        },
      ];
      const missingCards: PokemonCardModel[] = [];

      const probability = service.calculateNewTradableCardProbability(
        boosterCards,
        missingCards,
        false, // hasShinyRarity = false
      );

      expect(probability).toBe(0.0);
    });

    it('should return 0 when no tradable cards are missing', () => {
      const boosterCards = [
        {
          id: 1,
          name: 'Test Card ONE_DIAMOND',
          setId: 1,
          number: 1,
          rarity: Rarity.ONE_DIAMOND,
          isSixPackOnly: false,
        },
        {
          id: 2,
          name: 'Test Card ONE_STAR',
          setId: 1,
          number: 2,
          rarity: Rarity.ONE_STAR,
          isSixPackOnly: false,
        },
      ];
      const missingCards = [
        {
          id: 3,
          name: 'Test Card TWO_STARS',
          setId: 1,
          number: 3,
          rarity: Rarity.TWO_STARS,
          isSixPackOnly: false,
        },
        {
          id: 4,
          name: 'Test Card THREE_STARS',
          setId: 1,
          number: 4,
          rarity: Rarity.THREE_STARS,
          isSixPackOnly: false,
        },
      ];

      const probability = service.calculateNewTradableCardProbability(
        boosterCards,
        missingCards,
        false, // hasShinyRarity = false
      );

      expect(probability).toBe(0.0);
    });

    it('should calculate probability for missing tradable cards', () => {
      const boosterCards = [
        {
          id: 1,
          name: 'Test Card ONE_DIAMOND',
          setId: 1,
          number: 1,
          rarity: Rarity.ONE_DIAMOND,
          isSixPackOnly: false,
        },
        {
          id: 2,
          name: 'Test Card TWO_DIAMONDS',
          setId: 1,
          number: 2,
          rarity: Rarity.TWO_DIAMONDS,
          isSixPackOnly: false,
        },
        {
          id: 3,
          name: 'Test Card ONE_STAR',
          setId: 1,
          number: 3,
          rarity: Rarity.ONE_STAR,
          isSixPackOnly: false,
        },
        {
          id: 4,
          name: 'Test Card TWO_STARS',
          setId: 1,
          number: 4,
          rarity: Rarity.TWO_STARS,
          isSixPackOnly: false,
        },
        {
          id: 5,
          name: 'Test Card ONE_DIAMOND',
          setId: 1,
          number: 5,
          rarity: Rarity.ONE_DIAMOND,
          isSixPackOnly: false,
        },
      ];
      const missingCards = [
        {
          id: 6,
          name: 'Test Card ONE_DIAMOND',
          setId: 1,
          number: 6,
          rarity: Rarity.ONE_DIAMOND,
          isSixPackOnly: false,
        },
        {
          id: 7,
          name: 'Test Card ONE_STAR',
          setId: 1,
          number: 7,
          rarity: Rarity.ONE_STAR,
          isSixPackOnly: false,
        },
      ];

      const probability = service.calculateNewTradableCardProbability(
        boosterCards,
        missingCards,
        false, // hasShinyRarity = false
      );

      expect(probability).toBeGreaterThan(0.0);
      expect(probability).toBeLessThan(1.0);
    });

    it('should consider both normal and god packs', () => {
      const boosterCards = [
        {
          id: 1,
          name: 'Test Card ONE_DIAMOND',
          setId: 1,
          number: 1,
          rarity: Rarity.ONE_DIAMOND,
          isSixPackOnly: false,
        },
        {
          id: 2,
          name: 'Test Card ONE_STAR',
          setId: 1,
          number: 2,
          rarity: Rarity.ONE_STAR,
          isSixPackOnly: false,
        },
      ];
      const missingCards = [
        {
          id: 3,
          name: 'Test Card ONE_DIAMOND',
          setId: 1,
          number: 3,
          rarity: Rarity.ONE_DIAMOND,
          isSixPackOnly: false,
        },
        {
          id: 4,
          name: 'Test Card ONE_STAR',
          setId: 1,
          number: 4,
          rarity: Rarity.ONE_STAR,
          isSixPackOnly: false,
        },
      ];

      const probability = service.calculateNewTradableCardProbability(
        boosterCards,
        missingCards,
        false, // hasShinyRarity = false
      );

      // Should be higher than just normal pack probability
      const normalPackProbability = PACK_CONFIG.NORMAL_PACK_PROBABILITY;
      expect(probability).toBeGreaterThan(normalPackProbability);
    });
  });

  describe('Six-pack support', () => {
    function sixOnlyCard(id: number, rarity: Rarity): PokemonCardWithRelations {
      return {
        id,
        name: `SixOnly ${id}`,
        setId: 1,
        number: id,
        rarity,
        isSixPackOnly: true,
        boosters: [],
        ownership: [],
        set: { id: 1, key: 'TEST', name: 'Test Set' } as PokemonSetModel,
      } as PokemonCardWithRelations;
    }

    it('excludes isSixPackOnly from slots 1–5 and god packs; six-pack only contributes when only six-only cards are missing', () => {
      const boosterCards: PokemonCardModel[] = [
        // Non-six-only cards to populate normal/god pools
        createCard(Rarity.ONE_DIAMOND),
        createCard(Rarity.TWO_DIAMONDS),
        createCard(Rarity.THREE_DIAMONDS),
        createCard(Rarity.ONE_STAR),
        // Six-pack-only pools
        sixOnlyCard(1001, Rarity.ONE_STAR),
        sixOnlyCard(1002, Rarity.THREE_DIAMONDS),
      ];

      // Missing only the six-only cards
      const missingCards: PokemonCardModel[] = [
        sixOnlyCard(1001, Rarity.ONE_STAR),
        sixOnlyCard(1002, Rarity.THREE_DIAMONDS),
      ];

      const p = service.calculateNewCardProbability(
        boosterCards,
        missingCards,
        false,
      );

      // With only six-only missing, normal (slots 1–5) and god pack contribute 0.
      // Probability should equal six-pack weight * P(new in 6th slot)
      // P(new in 6th) = 0.129 * (1/1) + 0.871 * (1/1) = 1
      // Total ~= 0.0833
      expect(p).toBeCloseTo(0.0833, 3);
    });

    it('slot-6 rarity distribution uses uniform split within same rarity', () => {
      const boosterCards: PokemonCardModel[] = [
        // Non-six-only noise
        createCard(Rarity.ONE_DIAMOND),
        // Three 3◆ six-only cards
        sixOnlyCard(2001, Rarity.THREE_DIAMONDS),
        sixOnlyCard(2002, Rarity.THREE_DIAMONDS),
        sixOnlyCard(2003, Rarity.THREE_DIAMONDS),
      ];

      // Only one of the 3◆ six-only is missing
      const missingCards: PokemonCardModel[] = [
        sixOnlyCard(2001, Rarity.THREE_DIAMONDS),
      ];

      const p = service.calculateNewCardProbability(
        boosterCards,
        missingCards,
        false,
      );

      // Isolate slot-6 by having no missing non-six-only → slots 1–5 contribute 0; god 0
      // P(new in 6th) = 0.129 * 0 + 0.871 * (1/3)
      const expectedPSixth = 0.871 * (1 / 3);
      const expected = 0.0833 * expectedPSixth;
      expect(p).toBeCloseTo(expected, 4);
    });

    it('Ho-oh example: 1★ Magby and three 3◆ cards missing → six-pack branch equals weight', () => {
      const boosterCards: PokemonCardModel[] = [
        // Non-six-only noise
        createCard(Rarity.ONE_DIAMOND),
        // isSixPackOnly pools per example
        sixOnlyCard(3001, Rarity.ONE_STAR), // Magby (1★)
        sixOnlyCard(3002, Rarity.THREE_DIAMONDS), // Magby 3◆
        sixOnlyCard(3003, Rarity.THREE_DIAMONDS), // Kussilla 3◆
        sixOnlyCard(3004, Rarity.THREE_DIAMONDS), // Rabauz 3◆
      ];
      const missingCards: PokemonCardModel[] = [
        sixOnlyCard(3001, Rarity.ONE_STAR),
        sixOnlyCard(3002, Rarity.THREE_DIAMONDS),
        sixOnlyCard(3003, Rarity.THREE_DIAMONDS),
        sixOnlyCard(3004, Rarity.THREE_DIAMONDS),
      ];

      const p = service.calculateNewCardProbability(
        boosterCards,
        missingCards,
        false,
      );

      // P(new in 6th) = 0.129*(1) + 0.871*(3/3) = 1 → total ~= six-pack weight 0.0833
      expect(p).toBeCloseTo(0.0833, 3);
    });

    it('excludes sixPackOnly from slots 1–5: only 3◆ six-only missing → normal and god contribute 0', () => {
      const boosterCards: PokemonCardModel[] = [
        // Provide at least one non-six-only ONE_DIAMOND so booster isn’t empty, but missing none
        createCard(Rarity.ONE_DIAMOND),
        // Only THREE_DIAMONDS available are six-pack-only
        sixOnlyCard(4001, Rarity.THREE_DIAMONDS),
      ];
      const missingCards: PokemonCardModel[] = [
        sixOnlyCard(4001, Rarity.THREE_DIAMONDS),
      ];

      const p = service.calculateNewCardProbability(
        boosterCards,
        missingCards,
        false,
      );

      // Normal (slots 1–5) should exclude the 3◆ six-only → contributes 0
      // God pack should exclude six-only as well → contributes 0
      // Final probability = six-pack weight × P(new in 6th) = 0.0833 × 0.871
      const expected = 0.0833 * 0.871;
      expect(p).toBeCloseTo(expected, 4);
    });

    it('excludes sixPackOnly from god packs: only 1★ six-only missing → no god contribution', () => {
      const boosterCards: PokemonCardModel[] = [
        // Provide non-six-only ONE_DIAMOND noise
        createCard(Rarity.ONE_DIAMOND),
        // Only ONE_STAR available is six-pack-only
        sixOnlyCard(5001, Rarity.ONE_STAR),
      ];
      const missingCards: PokemonCardModel[] = [
        sixOnlyCard(5001, Rarity.ONE_STAR),
      ];

      const p = service.calculateNewCardProbability(
        boosterCards,
        missingCards,
        false,
      );

      // God pack excludes six-only 1★, normal (slots 1–5) excludes six-only as well
      // Final probability = six-pack weight × P(new in 6th) = 0.0833 × 0.129
      const expected = 0.0833 * 0.129;
      expect(p).toBeCloseTo(expected, 4);
    });
  });
});

/** Creates a set of test cards with various rarities */
function createTestCards(): PokemonCardWithRelations[] {
  const cards: PokemonCardWithRelations[] = [];
  let id = 1;

  // Add some cards of each rarity
  for (const rarity of Object.values(Rarity)) {
    for (let i = 0; i < 3; i++) {
      cards.push({
        id: id++,
        name: `Test Card ${id}`,
        setId: 1,
        number: id,
        rarity,
        isSixPackOnly: false,
        boosters: [],
        ownership: [],
        set: {
          name: 'Test Set',
          id: 1,
          key: 'TEST',
        } as PokemonSetModel,
      } as PokemonCardWithRelations);
    }
  }

  return cards;
}

function createCard(rarity: Rarity): PokemonCardWithRelations {
  return {
    id: 0,
    name: 'Test Card',
    setId: 0,
    number: 0,
    rarity,
    isSixPackOnly: false,
    boosters: [],
    ownership: [],
    set: {
      name: 'Test Set',
      id: 0,
      key: 'TEST',
    } as PokemonSetModel,
  } as PokemonCardWithRelations;
}
