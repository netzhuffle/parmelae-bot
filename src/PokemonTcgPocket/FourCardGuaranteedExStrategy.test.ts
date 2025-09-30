import { describe, it, beforeEach, expect } from 'bun:test';
import { FourCardGuaranteedExStrategy } from './FourCardGuaranteedExStrategy.js';
import { Rarity } from '../generated/prisma/enums.js';

describe('FourCardGuaranteedExStrategy', () => {
  let strategy: FourCardGuaranteedExStrategy;

  beforeEach(() => {
    strategy = new FourCardGuaranteedExStrategy();
  });

  describe('constructor', () => {
    it('should create strategy without errors', () => {
      expect(() => new FourCardGuaranteedExStrategy()).not.toThrow();
    });

    it('should validate all distributions sum to 1.0', () => {
      // If constructor doesn't throw, distributions are valid
      expect(strategy.getCardsPerPack()).toBe(4);
    });
  });

  describe('getCardsPerPack', () => {
    it('should return 4', () => {
      expect(strategy.getCardsPerPack()).toBe(4);
    });
  });

  describe('getSlotDistribution', () => {
    it('should return correct distribution for slot 1', () => {
      const distribution = strategy.getSlotDistribution(1);

      expect(distribution.size).toBe(1);
      expect(distribution.get(Rarity.ONE_DIAMOND)).toBe(1.0);
    });

    it('should return correct distribution for slot 2', () => {
      const distribution = strategy.getSlotDistribution(2);

      expect(distribution.size).toBe(2);
      expect(distribution.get(Rarity.ONE_DIAMOND)).toBe(0.1773);
      expect(distribution.get(Rarity.TWO_DIAMONDS)).toBe(0.8227);
    });

    it('should return correct distribution for slot 3', () => {
      const distribution = strategy.getSlotDistribution(3);

      expect(distribution.size).toBe(9);
      expect(distribution.get(Rarity.ONE_DIAMOND_FOIL)).toBe(0.23021);
      expect(distribution.get(Rarity.TWO_DIAMONDS_FOIL)).toBe(0.17986);
      expect(distribution.get(Rarity.THREE_DIAMONDS)).toBe(0.31663);
      expect(distribution.get(Rarity.THREE_DIAMONDS_FOIL)).toBe(0.08996);
      expect(distribution.get(Rarity.ONE_STAR)).toBe(0.12858);
      expect(distribution.get(Rarity.TWO_STARS)).toBe(0.025);
      expect(distribution.get(Rarity.THREE_STARS)).toBe(0.01111);
      expect(distribution.get(Rarity.TWO_SHINY)).toBe(0.01667);
      expect(distribution.get(Rarity.CROWN)).toBe(0.00198);

      // Ensure ONE_SHINY is not present
      expect(distribution.has(Rarity.ONE_SHINY)).toBe(false);
    });

    it('should return correct distribution for slot 4', () => {
      const distribution = strategy.getSlotDistribution(4);

      expect(distribution.size).toBe(1);
      expect(distribution.get(Rarity.FOUR_DIAMONDS)).toBe(1.0);
    });
  });

  describe('distribution validation', () => {
    it('should have distributions that sum to 1.0 for all slots', () => {
      const tolerance = 0.0001;

      for (let slot = 1; slot <= 4; slot++) {
        const distribution = strategy.getSlotDistribution(
          slot as 1 | 2 | 3 | 4,
        );
        const sum = Array.from(distribution.values()).reduce(
          (acc, prob) => acc + prob,
          0,
        );

        expect(Math.abs(sum - 1.0)).toBeLessThan(tolerance);
      }
    });

    it('should have no negative probabilities', () => {
      for (let slot = 1; slot <= 4; slot++) {
        const distribution = strategy.getSlotDistribution(
          slot as 1 | 2 | 3 | 4,
        );

        for (const probability of distribution.values()) {
          expect(probability).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should not contain ONE_SHINY in any slot', () => {
      for (let slot = 1; slot <= 4; slot++) {
        const distribution = strategy.getSlotDistribution(
          slot as 1 | 2 | 3 | 4,
        );
        expect(distribution.has(Rarity.ONE_SHINY)).toBe(false);
      }
    });
  });

  describe('foil rarities', () => {
    it('should include foil rarities in slot 3', () => {
      const distribution = strategy.getSlotDistribution(3);

      expect(distribution.has(Rarity.ONE_DIAMOND_FOIL)).toBe(true);
      expect(distribution.has(Rarity.TWO_DIAMONDS_FOIL)).toBe(true);
      expect(distribution.has(Rarity.THREE_DIAMONDS_FOIL)).toBe(true);
    });

    it('should not include foil rarities in other slots', () => {
      const foilRarities = [
        Rarity.ONE_DIAMOND_FOIL,
        Rarity.TWO_DIAMONDS_FOIL,
        Rarity.THREE_DIAMONDS_FOIL,
      ];

      // Check slots 1, 2, and 4
      for (const slot of [1, 2, 4]) {
        const distribution = strategy.getSlotDistribution(slot as 1 | 2 | 4);

        for (const foilRarity of foilRarities) {
          expect(distribution.has(foilRarity)).toBe(false);
        }
      }
    });
  });
});
