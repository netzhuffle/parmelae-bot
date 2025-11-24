import { describe, it, expect } from 'bun:test';
import { ShinyAsPotentialSixthCardStrategy } from './ShinyAsPotentialSixthCardStrategy.js';
import { Rarity } from '../../generated/prisma/enums.js';

describe('ShinyAsPotentialSixthCardStrategy', () => {
  const strategy = new ShinyAsPotentialSixthCardStrategy();

  describe('cardsPerPack', () => {
    it('should be 5', () => {
      expect(strategy.cardsPerPack).toBe(5);
    });
  });

  describe('packWeights', () => {
    it('should sum to 1.0', () => {
      const sum =
        strategy.packWeights.normal +
        strategy.packWeights.god +
        (strategy.packWeights.six ?? 0);
      expect(sum).toBeCloseTo(1.0, 4);
    });
  });

  describe('slotDistributions', () => {
    it('should have slots 1-6 defined', () => {
      expect(strategy.slotDistributions[1]).toBeDefined();
      expect(strategy.slotDistributions[2]).toBeDefined();
      expect(strategy.slotDistributions[3]).toBeDefined();
      expect(strategy.slotDistributions[4]).toBeDefined();
      expect(strategy.slotDistributions[5]).toBeDefined();
      expect(strategy.slotDistributions[6]).toBeDefined();
    });

    it('should have slots 1-3 as 100% ONE_DIAMOND', () => {
      for (let slot = 1; slot <= 3; slot++) {
        const distribution =
          strategy.slotDistributions[
            slot as keyof typeof strategy.slotDistributions
          ];
        expect(distribution?.size).toBe(1);
        expect(distribution?.get(Rarity.ONE_DIAMOND)).toBe(1);
      }
    });

    it('should have slot 4 distribution sum to 1.0', () => {
      const distribution = strategy.slotDistributions[4];
      expect(distribution).toBeDefined();
      if (!distribution) return;
      const sum = Array.from(distribution.values()).reduce(
        (acc, val) => acc + val,
        0,
      );
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it('should have slot 4 exclude shiny rarities', () => {
      const distribution = strategy.slotDistributions[4];
      expect(distribution?.has(Rarity.ONE_SHINY)).toBe(false);
      expect(distribution?.has(Rarity.TWO_SHINY)).toBe(false);
    });

    it('should have slot 5 distribution sum to 1.0', () => {
      const distribution = strategy.slotDistributions[5];
      expect(distribution).toBeDefined();
      if (!distribution) return;
      const sum = Array.from(distribution.values()).reduce(
        (acc, val) => acc + val,
        0,
      );
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it('should have slot 5 exclude shiny rarities', () => {
      const distribution = strategy.slotDistributions[5];
      expect(distribution?.has(Rarity.ONE_SHINY)).toBe(false);
      expect(distribution?.has(Rarity.TWO_SHINY)).toBe(false);
    });

    it('should have slot 6 distribution sum to 1.0', () => {
      const distribution = strategy.slotDistributions[6];
      expect(distribution).toBeDefined();
      if (!distribution) return;
      const sum = Array.from(distribution.values()).reduce(
        (acc, val) => acc + val,
        0,
      );
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it('should have slot 6 only contain shiny rarities', () => {
      const distribution = strategy.slotDistributions[6];
      expect(distribution?.has(Rarity.ONE_SHINY)).toBe(true);
      expect(distribution?.has(Rarity.TWO_SHINY)).toBe(true);
      // Should only have these two rarities
      expect(distribution?.size).toBe(2);
    });
  });

  describe('godPackRarities', () => {
    it('should exclude ONE_SHINY and TWO_SHINY', () => {
      expect(strategy.godPackRarities.has(Rarity.ONE_SHINY)).toBe(false);
      expect(strategy.godPackRarities.has(Rarity.TWO_SHINY)).toBe(false);
    });

    it('should include other god pack rarities', () => {
      expect(strategy.godPackRarities.has(Rarity.ONE_STAR)).toBe(true);
      expect(strategy.godPackRarities.has(Rarity.TWO_STARS)).toBe(true);
      expect(strategy.godPackRarities.has(Rarity.THREE_STARS)).toBe(true);
      expect(strategy.godPackRarities.has(Rarity.CROWN)).toBe(true);
    });
  });

  describe('sixthCardFilterMode', () => {
    it('should be rarity-based', () => {
      expect(strategy.sixthCardFilterMode).toBe('rarity-based');
    });
  });
});
