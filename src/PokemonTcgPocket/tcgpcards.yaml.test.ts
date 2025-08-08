import { describe, it, beforeAll, expect } from 'bun:test';
import { load } from 'js-yaml';
import {
  Card,
  SetData,
  Sets,
  SET_KEY_VALUES,
  SET_KEY_NAMES,
  BOOSTER_VALUES,
  SetKey,
} from './PokemonTcgPocketService.js';

/** Maps rarity symbols to database enum values */
const VALID_RARITY_SYMBOLS = new Set([
  '♢',
  '♢♢',
  '♢♢♢',
  '♢♢♢♢',
  '☆',
  '☆☆',
  '☆☆☆',
  '☆☆☆☆',
  '✸',
  '✸✸',
  '♛',
]);

describe('tcgpcards.yaml', () => {
  let yamlContent: string;
  let sets: Sets;

  beforeAll(async () => {
    const yamlFile = Bun.file('resources/tcgpcards.yaml');
    yamlContent = await yamlFile.text();
    sets = load(yamlContent) as Sets;
  });

  describe('File structure', () => {
    it('should be valid YAML', () => {
      expect(() => load(yamlContent)).not.toThrow();
    });
  });

  describe('Set validation', () => {
    it('should have required fields for each set', () => {
      Object.values(sets).forEach((setData: SetData) => {
        expect(setData.name).toBeDefined();
        expect(typeof setData.name).toBe('string');
        expect(setData.cards).toBeDefined();
        expect(typeof setData.cards).toBe('object');
      });
    });

    it('should have valid booster configurations', () => {
      Object.values(sets).forEach((setData: SetData) => {
        if (setData.boosters === undefined) return;
        if (setData.boosters === null) return;

        expect(Array.isArray(setData.boosters)).toBe(true);
        expect(setData.boosters.length).toBeGreaterThan(0);

        // Check for duplicate boosters
        const uniqueBoosters = new Set(setData.boosters);
        expect(uniqueBoosters.size).toBe(setData.boosters.length);

        // Verify booster names are strings
        setData.boosters.forEach((booster: string) => {
          expect(typeof booster).toBe('string');
          expect(booster.length).toBeGreaterThan(0);
        });
      });
    });

    it('should have valid card numbers', () => {
      Object.values(sets).forEach((setData: SetData) => {
        const cardNumbers = Object.keys(setData.cards).map(Number);

        // Check for valid numbers
        cardNumbers.forEach((number) => {
          expect(Number.isInteger(number)).toBe(true);
          expect(number).toBeGreaterThan(0);
        });

        // Check for duplicates
        const uniqueNumbers = new Set(cardNumbers);
        expect(uniqueNumbers.size).toBe(cardNumbers.length);
      });
    });
  });

  describe('Card validation', () => {
    it('should have required fields for each card', () => {
      Object.values(sets).forEach((setData: SetData) => {
        Object.values(setData.cards).forEach((card: Card) => {
          expect(card.name).toBeDefined();
          expect(typeof card.name).toBe('string');
          expect(card.name.length).toBeGreaterThan(0);
        });
      });
    });

    it('should only use " ex" as a suffix for ex cards', () => {
      Object.values(sets).forEach((setData: SetData) => {
        Object.values(setData.cards).forEach((card: Card) => {
          // Check if card name ends with ' ex' or '-ex' (case insensitive)
          const exSuffixRegex = /[\s-](?:ex|EX)$/i;
          const match = exSuffixRegex.exec(card.name);

          // Skip if no ' ex' or '-ex' suffix found
          if (!match) {
            return;
          }

          // Fail if suffix is not exactly ' ex'
          const suffix = match[0];
          expect(suffix).toBe(' ex');
        });
      });
    });

    it('should have valid rarity symbols', () => {
      Object.values(sets).forEach((setData: SetData) => {
        Object.values(setData.cards).forEach((card: Card) => {
          if (card.rarity) {
            expect(VALID_RARITY_SYMBOLS.has(card.rarity)).toBe(true);
          }
        });
      });
    });

    it('should have correct rarity for ex cards', () => {
      const validExRarities = new Set(['♢♢♢♢', '☆☆', '☆☆☆', '✸✸', '♛']);

      Object.values(sets).forEach((setData: SetData) => {
        Object.values(setData.cards).forEach((card: Card) => {
          if (card.name.endsWith(' ex')) {
            // Allow undefined rarity or valid ex rarity
            if (card.rarity) {
              expect(validExRarities.has(card.rarity)).toBe(true);
            }
          }
        });
      });
    });

    it('should have ex suffix for specific rarities', () => {
      const exRequiredRarities = new Set(['♢♢♢♢', '✸✸']);

      Object.values(sets).forEach((setData: SetData) => {
        Object.values(setData.cards).forEach((card: Card) => {
          if (card.rarity && exRequiredRarities.has(card.rarity)) {
            expect(card.name.endsWith(' ex')).toBe(true);
          }
        });
      });
    });

    it('should reference valid boosters', () => {
      Object.entries(sets).forEach(([, setData]: [string, SetData]) => {
        const validBoosters = new Set(setData.boosters ?? [setData.name]);

        Object.values(setData.cards).forEach((card: Card) => {
          if (card.boosters === undefined || card.boosters === null) return;

          const boosterList = Array.isArray(card.boosters)
            ? card.boosters
            : [card.boosters];

          boosterList.forEach((booster: string) => {
            if (setData.boosters !== null) {
              expect(validBoosters.has(booster)).toBe(true);
            }
          });
        });
      });
    });

    it('should have valid equalTo references', () => {
      const setKeys = new Set(Object.keys(sets));

      Object.values(sets).forEach((setData: SetData) => {
        Object.values(setData.cards).forEach((card: Card) => {
          if (card.equalTo) {
            expect(setKeys.has(card.equalTo)).toBe(true);
          }
        });
      });
    });

    it('should have consistent booster assignments', () => {
      Object.values(sets).forEach((setData: SetData) => {
        // Skip sets with null boosters
        if (setData.boosters === null) return;

        Object.values(setData.cards).forEach((card: Card) => {
          if (card.boosters === undefined) return;
          if (card.boosters === null) return;

          const boosterList = Array.isArray(card.boosters)
            ? card.boosters
            : [card.boosters];

          // Check for duplicate booster assignments
          const uniqueBoosters = new Set(boosterList);
          expect(uniqueBoosters.size).toBe(boosterList.length);
        });
      });
    });

    it('should have valid isSixPackOnly values', () => {
      Object.values(sets).forEach((setData: SetData) => {
        Object.values(setData.cards).forEach((card: Card) => {
          if ('isSixPackOnly' in card) {
            expect(card.isSixPackOnly).toBe(true);
          }
        });
      });
    });

    it('should restrict isSixPackOnly cards to ☆ or ♢♢♢ rarities', () => {
      Object.values(sets).forEach((setData: SetData) => {
        Object.values(setData.cards).forEach((card: Card) => {
          if (card.isSixPackOnly === true) {
            // Rarity must be exactly ☆ or ♢♢♢
            expect(card.rarity).toBeDefined();
            const allowed = new Set(['☆', '♢♢♢']);
            expect(allowed.has(card.rarity!)).toBe(true);
          }
        });
      });
    });
  });

  describe('Service and YAML consistency', () => {
    it('should have matching set keys, names, and booster names between service and YAML', () => {
      // Get all set keys from YAML
      const yamlSetKeys = new Set(Object.keys(sets));

      // Get all set names from YAML
      const yamlSetNames = new Set(Object.values(sets).map((set) => set.name));

      // Get all booster names from YAML
      const yamlBoosterNames = new Set(
        Object.values(sets).flatMap((set) =>
          set.boosters === null ? [] : (set.boosters ?? [set.name]),
        ),
      );

      // Verify all YAML set keys exist in service
      yamlSetKeys.forEach((key) => {
        expect(SET_KEY_VALUES).toContain(key as SetKey);
      });

      // Verify all service set keys exist in YAML
      SET_KEY_VALUES.forEach((key) => {
        expect(yamlSetKeys.has(key)).toBe(true);
      });

      // Verify all YAML set names exist in service
      yamlSetNames.forEach((name) => {
        expect(Object.values(SET_KEY_NAMES)).toContain(name);
      });

      // Verify all service set names exist in YAML
      Object.values(SET_KEY_NAMES).forEach((name) => {
        expect(yamlSetNames.has(name)).toBe(true);
      });

      // Verify all YAML booster names exist in service
      yamlBoosterNames.forEach((name) => {
        expect(BOOSTER_VALUES).toContain(
          name as (typeof BOOSTER_VALUES)[number],
        );
      });

      // Verify all service booster names exist in YAML
      BOOSTER_VALUES.forEach((name) => {
        expect(yamlBoosterNames.has(name)).toBe(true);
      });
    });

    it('should have matching set names for each set key between service and YAML', () => {
      // For each set key in the YAML, verify its name matches the service
      Object.entries(sets).forEach(([key, setData]) => {
        const serviceName = SET_KEY_NAMES[key as SetKey];
        expect(serviceName).toBe(setData.name);
      });

      // For each set key in the service, verify its name matches the YAML
      SET_KEY_VALUES.forEach((key) => {
        const yamlSetData = sets[key];
        expect(yamlSetData).toBeDefined();
        const yamlName = yamlSetData.name;
        expect(SET_KEY_NAMES[key]).toBe(yamlName);
      });
    });
  });
});
