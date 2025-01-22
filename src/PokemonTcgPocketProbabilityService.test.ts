import { PokemonCard, Rarity } from '@prisma/client';
import { PokemonTcgPocketProbabilityService } from './PokemonTcgPocketProbabilityService.js';

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
