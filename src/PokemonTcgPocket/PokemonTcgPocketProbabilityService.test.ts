import { PokemonCard, Rarity } from '@prisma/client';
import { PokemonTcgPocketProbabilityService } from './PokemonTcgPocketProbabilityService.js';
import { PACK_CONFIG } from './PokemonTcgPocketProbabilityService.js';

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

  describe('calculateNewCardProbability', () => {
    it('should return 0 when no cards are missing', () => {
      const boosterCards = createTestCards();
      const missingCards: PokemonCard[] = [];

      const probability = service.calculateNewCardProbability(
        boosterCards,
        missingCards,
      );

      expect(probability).toBe(0);
    });

    it('should return 1 when all cards are missing and there are cards of every rarity', () => {
      const boosterCards = createTestCards();
      const missingCards = [...boosterCards];

      const probability = service.calculateNewCardProbability(
        boosterCards,
        missingCards,
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
      );

      // Probabilities aren't set yet
      expect(probability).toBe(0);
    });

    it('should handle empty booster', () => {
      const boosterCards: PokemonCard[] = [];
      const missingCards: PokemonCard[] = [];

      const probability = service.calculateNewCardProbability(
        boosterCards,
        missingCards,
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
      );

      expect(probability).toBe(0);
    });

    it('should handle empty booster for diamond probability', () => {
      const boosterCards: PokemonCard[] = [];
      const missingCards: PokemonCard[] = [];

      const probability = service.calculateNewDiamondCardProbability(
        boosterCards,
        missingCards,
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
        },
        {
          id: 2,
          name: 'Test Card ONE_STAR',
          setId: 1,
          number: 2,
          rarity: Rarity.ONE_STAR,
        },
      ];
      const missingCards: PokemonCard[] = [];

      const probability = service.calculateNewTradableCardProbability(
        boosterCards,
        missingCards,
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
        },
        {
          id: 2,
          name: 'Test Card ONE_STAR',
          setId: 1,
          number: 2,
          rarity: Rarity.ONE_STAR,
        },
      ];
      const missingCards = [
        {
          id: 3,
          name: 'Test Card TWO_STARS',
          setId: 1,
          number: 3,
          rarity: Rarity.TWO_STARS,
        },
        {
          id: 4,
          name: 'Test Card THREE_STARS',
          setId: 1,
          number: 4,
          rarity: Rarity.THREE_STARS,
        },
      ];

      const probability = service.calculateNewTradableCardProbability(
        boosterCards,
        missingCards,
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
        },
        {
          id: 2,
          name: 'Test Card TWO_DIAMONDS',
          setId: 1,
          number: 2,
          rarity: Rarity.TWO_DIAMONDS,
        },
        {
          id: 3,
          name: 'Test Card ONE_STAR',
          setId: 1,
          number: 3,
          rarity: Rarity.ONE_STAR,
        },
        {
          id: 4,
          name: 'Test Card TWO_STARS',
          setId: 1,
          number: 4,
          rarity: Rarity.TWO_STARS,
        },
        {
          id: 5,
          name: 'Test Card ONE_DIAMOND',
          setId: 1,
          number: 5,
          rarity: Rarity.ONE_DIAMOND,
        },
      ];
      const missingCards = [
        {
          id: 6,
          name: 'Test Card ONE_DIAMOND',
          setId: 1,
          number: 6,
          rarity: Rarity.ONE_DIAMOND,
        },
        {
          id: 7,
          name: 'Test Card ONE_STAR',
          setId: 1,
          number: 7,
          rarity: Rarity.ONE_STAR,
        },
      ];

      const probability = service.calculateNewTradableCardProbability(
        boosterCards,
        missingCards,
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
        },
        {
          id: 2,
          name: 'Test Card ONE_STAR',
          setId: 1,
          number: 2,
          rarity: Rarity.ONE_STAR,
        },
      ];
      const missingCards = [
        {
          id: 3,
          name: 'Test Card ONE_DIAMOND',
          setId: 1,
          number: 3,
          rarity: Rarity.ONE_DIAMOND,
        },
        {
          id: 4,
          name: 'Test Card ONE_STAR',
          setId: 1,
          number: 4,
          rarity: Rarity.ONE_STAR,
        },
      ];

      const probability = service.calculateNewTradableCardProbability(
        boosterCards,
        missingCards,
      );

      // Should be higher than just normal pack probability
      const normalPackProbability = PACK_CONFIG.NORMAL_PACK_PROBABILITY;
      expect(probability).toBeGreaterThan(normalPackProbability);
    });
  });
});

/** Creates a set of test cards with various rarities */
function createTestCards(): PokemonCard[] {
  const cards: PokemonCard[] = [];
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
      });
    }
  }

  return cards;
}
