import { describe, it, beforeEach, expect } from 'bun:test';
import { FourCardGuaranteedExStrategy } from './FourCardGuaranteedExStrategy.js';
import { Rarity } from '../../generated/prisma/enums.js';

describe('FourCardGuaranteedExStrategy', () => {
  let strategy: FourCardGuaranteedExStrategy;

  beforeEach(() => {
    strategy = new FourCardGuaranteedExStrategy();
  });

  describe('cardsPerPack', () => {
    it('should be 4', () => {
      expect(strategy.cardsPerPack).toBe(4);
    });
  });

  describe('slotDistributions', () => {
    it('should have all slots defined', () => {
      expect(strategy.slotDistributions[1]).toBeDefined();
      expect(strategy.slotDistributions[2]).toBeDefined();
      expect(strategy.slotDistributions[3]).toBeDefined();
      expect(strategy.slotDistributions[4]).toBeDefined();
    });

    it('should have slot 3 exclude ONE_SHINY', () => {
      const distribution = strategy.slotDistributions[3];
      expect(distribution).toBeDefined();
      expect(distribution?.has(Rarity.ONE_SHINY)).toBe(false);
    });
  });

  describe('godPackRarities', () => {
    it('should exclude ONE_SHINY', () => {
      expect(strategy.godPackRarities.has(Rarity.ONE_SHINY)).toBe(false);
    });

    it('should include TWO_SHINY', () => {
      expect(strategy.godPackRarities.has(Rarity.TWO_SHINY)).toBe(true);
    });

    it('should include other god pack rarities', () => {
      expect(strategy.godPackRarities.has(Rarity.ONE_STAR)).toBe(true);
      expect(strategy.godPackRarities.has(Rarity.TWO_STARS)).toBe(true);
      expect(strategy.godPackRarities.has(Rarity.THREE_STARS)).toBe(true);
      expect(strategy.godPackRarities.has(Rarity.CROWN)).toBe(true);
    });
  });

  describe('distribution validation', () => {
    it('should have distributions that sum to 1.0 for all slots', () => {
      const tolerance = 0.0001;

      for (let slot = 1; slot <= 4; slot++) {
        const distribution = strategy.slotDistributions[slot as 1 | 2 | 3 | 4];
        expect(distribution).toBeDefined();
        if (!distribution) continue;
        const sum = Array.from(distribution.values()).reduce(
          (acc, prob) => acc + prob,
          0,
        );

        expect(Math.abs(sum - 1.0)).toBeLessThan(tolerance);
      }
    });

    it('should have no negative probabilities', () => {
      for (let slot = 1; slot <= 4; slot++) {
        const distribution = strategy.slotDistributions[slot as 1 | 2 | 3 | 4];
        expect(distribution).toBeDefined();
        if (!distribution) continue;

        for (const probability of distribution.values()) {
          expect(probability).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should not contain ONE_SHINY in any slot', () => {
      for (let slot = 1; slot <= 4; slot++) {
        const distribution = strategy.slotDistributions[slot as 1 | 2 | 3 | 4];
        expect(distribution).toBeDefined();
        expect(distribution?.has(Rarity.ONE_SHINY)).toBe(false);
      }
    });
  });

  describe('foil rarities', () => {
    it('should include foil rarities in slot 3', () => {
      const distribution = strategy.slotDistributions[3];
      expect(distribution).toBeDefined();

      expect(distribution?.has(Rarity.ONE_DIAMOND_FOIL)).toBe(true);
      expect(distribution?.has(Rarity.TWO_DIAMONDS_FOIL)).toBe(true);
      expect(distribution?.has(Rarity.THREE_DIAMONDS_FOIL)).toBe(true);
    });

    it('should not include foil rarities in other slots', () => {
      const foilRarities = [
        Rarity.ONE_DIAMOND_FOIL,
        Rarity.TWO_DIAMONDS_FOIL,
        Rarity.THREE_DIAMONDS_FOIL,
      ];

      // Check slots 1, 2, and 4
      for (const slot of [1, 2, 4]) {
        const distribution = strategy.slotDistributions[slot as 1 | 2 | 4];
        expect(distribution).toBeDefined();

        for (const foilRarity of foilRarities) {
          expect(distribution?.has(foilRarity)).toBe(false);
        }
      }
    });
  });
});
