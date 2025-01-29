import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { Card, SetData, Sets } from './PokemonTcgPocketService.js';

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
  '♛',
]);

describe('tcgpcards.yaml', () => {
  let yamlContent: string;
  let sets: Sets;

  beforeAll(() => {
    yamlContent = readFileSync('resources/tcgpcards.yaml', 'utf-8');
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
      Object.entries(sets).forEach(([setKey, setData]: [string, SetData]) => {
        Object.entries(setData.cards).forEach(
          ([cardNumber, card]: [string, Card]) => {
            // Check if card name ends with ' ex' or '-ex' (case insensitive)
            const exSuffixRegex = /[\s-](?:ex|EX)$/i;
            const match = exSuffixRegex.exec(card.name);

            // Skip if no ' ex' or '-ex' suffix found
            if (!match) {
              return;
            }

            // Fail if suffix is not exactly ' ex'
            const suffix = match[0];
            if (suffix !== ' ex') {
              fail(
                `Card "${card.name}" (${setKey}-${cardNumber}) has invalid ex suffix "${suffix}". Only " ex" is allowed.`,
              );
            }
          },
        );
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

      Object.entries(sets).forEach(([setKey, setData]: [string, SetData]) => {
        Object.entries(setData.cards).forEach(
          ([cardNumber, card]: [string, Card]) => {
            if (card.equalTo) {
              if (!setKeys.has(card.equalTo)) {
                fail(
                  `Invalid equalTo reference: ${card.equalTo} in set ${setKey}, card ${cardNumber}`,
                );
              }
            }
          },
        );
      });
    });

    it('should have consistent booster assignments', () => {
      Object.entries(sets).forEach(([setKey, setData]: [string, SetData]) => {
        // Skip sets with null boosters
        if (setData.boosters === null) return;

        Object.entries(setData.cards).forEach(
          ([cardNumber, card]: [string, Card]) => {
            if (card.boosters === undefined) return;
            if (card.boosters === null) return;

            const boosterList = Array.isArray(card.boosters)
              ? card.boosters
              : [card.boosters];

            // Check for duplicate booster assignments
            const uniqueBoosters = new Set(boosterList);
            if (uniqueBoosters.size !== boosterList.length) {
              fail(
                `Duplicate booster assignment in set ${setKey}, card ${cardNumber}`,
              );
            }
          },
        );
      });
    });
  });
});
