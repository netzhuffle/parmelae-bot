import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import {
  matchAll,
  escapeYamlString,
  formatYaml,
  fetchWikitext,
  parseSet,
  type CardEntry,
} from '../pokewiki-scraper.ts';

describe('Pokewiki Scraper', () => {
  describe('matchAll helper', () => {
    it('should extract all regex matches with capture groups', () => {
      const text =
        '{{Setzeile|1|Bisasam|SomeField|C Pocket|}} {{Setzeile|2|Bisaknosp|SomeField|U Pocket|}}';
      const regex =
        /\{\{Setzeile\|(\d+)\|([^|]+)\|[^|]*?\|([^}|]+)(?:\|[^}]*)?\}\}/g;
      const matches = matchAll(text, regex);

      expect(matches.length).toBe(2);
      expect(matches[0]).toEqual(['1', 'Bisasam', 'C Pocket']);
      expect(matches[1]).toEqual(['2', 'Bisaknosp', 'U Pocket']);
    });

    it('should return empty array when no matches found', () => {
      const text = 'No matches here';
      const regex =
        /\{\{Setzeile\|(\d+)\|([^|]+)\|[^|]*?\|([^}|]+)(?:\|[^}]*)?\}\}/g;
      const matches = matchAll(text, regex);

      expect(matches).toEqual([]);
    });
  });

  describe('escapeYamlString', () => {
    it('should not quote simple strings', () => {
      expect(escapeYamlString('Simple')).toBe('Simple');
      expect(escapeYamlString('CardName')).toBe('CardName');
    });

    it('should quote strings with special YAML characters', () => {
      const result1 = escapeYamlString('Name: Value');
      expect(result1).toMatch(/^".*"$/);
      expect(result1).toContain('Name: Value');

      const result2 = escapeYamlString('Card #123');
      expect(result2).toMatch(/^".*"$/);
      expect(result2).toContain('Card #123');
    });

    it('should escape quotes and backslashes in quoted strings', () => {
      const result = escapeYamlString('Text with "quotes"');
      expect(result).toMatch(/^".*"$/);
      expect(result).toContain('\\"');
      expect(result).not.toContain('"quotes"');
    });
  });

  describe('formatYaml', () => {
    it('should format single-booster set correctly', () => {
      const setId = 'A1a';
      const setName = 'Mysteriöse Insel';
      const boosters: string[] = [];
      const cards: CardEntry[] = [
        { number: 1, name: 'Bisasam', rarity: '♢', boosters: [] },
        { number: 2, name: 'Bisaknosp', rarity: '♢♢', boosters: [] },
      ];

      const yaml = formatYaml(setId, setName, boosters, cards);

      expect(yaml).toContain(`${setId}:`);
      expect(yaml).toContain(`name: ${setName}`);
      expect(yaml).toContain('cards:');
      expect(yaml).toContain('1:');
      expect(yaml).toContain('name: Bisasam');
      expect(yaml).toContain('rarity: ♢');
      // Should not contain boosters field for single-booster sets
      expect(yaml).not.toContain('boosters:');
    });

    it('should format multi-booster set correctly', () => {
      const setId = 'A1';
      const setName = 'Unschlagbare Gene';
      const boosters = ['Glurak', 'Mewtu', 'Pikachu'];
      const cards: CardEntry[] = [
        { number: 1, name: 'Bisasam', rarity: '♢', boosters: ['Mewtu'] },
        { number: 2, name: 'Bisaknosp', rarity: '♢♢', boosters: ['Mewtu'] },
      ];

      const yaml = formatYaml(setId, setName, boosters, cards);

      expect(yaml).toContain(`${setId}:`);
      expect(yaml).toContain(`name: ${setName}`);
      expect(yaml).toContain('boosters:');
      expect(yaml).toContain('- Glurak');
      expect(yaml).toContain('- Mewtu');
      expect(yaml).toContain('- Pikachu');
      expect(yaml).toContain('cards:');
      expect(yaml).toContain('1:');
      expect(yaml).toContain('name: Bisasam');
      expect(yaml).toContain('rarity: ♢');
      expect(yaml).toContain('boosters: Mewtu');
    });

    it('should format cards with multiple boosters correctly', () => {
      const setId = 'A1';
      const setName = 'Unschlagbare Gene';
      const boosters = ['Glurak', 'Mewtu'];
      const cards: CardEntry[] = [
        {
          number: 1,
          name: 'Bisasam',
          rarity: '♢',
          boosters: ['Glurak', 'Mewtu'],
        },
      ];

      const yaml = formatYaml(setId, setName, boosters, cards);

      expect(yaml).toContain('boosters:');
      expect(yaml).toContain('        - Glurak');
      expect(yaml).toContain('        - Mewtu');
    });
  });

  describe('URL validation', () => {
    it('should validate Pokewiki URLs', async () => {
      // Test that fetchWikitext validates URLs
      // Invalid domain
      const invalidDomainPromise = fetchWikitext(
        'https://example.com/Some_Page',
      );
      // eslint-disable-next-line @typescript-eslint/await-thenable
      await expect(invalidDomainPromise).rejects.toThrow('URL must be from');

      // Invalid URL format
      const invalidUrlPromise = fetchWikitext('not-a-url');
      // eslint-disable-next-line @typescript-eslint/await-thenable
      await expect(invalidUrlPromise).rejects.toThrow('Invalid URL');
    });
  });

  describe('fetchWikitext', () => {
    beforeEach(() => {
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(`
            <html>
              <body>
                <textarea id="wpTextbox1">Test wikitext content with sufficient length ${'x'.repeat(5000)}</textarea>
              </body>
            </html>
          `),
        } as Response),
      ) as unknown as typeof fetch;
    });

    afterEach(() => {
      // @ts-expect-error - Cleaning up mock
      delete global.fetch;
    });

    it('should fetch and extract wikitext from edit page', async () => {
      const url = 'https://www.pokewiki.de/Test_Set';
      const wikitextPromise = fetchWikitext(url);
      const wikitext = await wikitextPromise;

      expect(wikitext).toContain('Test wikitext content');
      expect(wikitext.length).toBeGreaterThan(5000);
    });

    it('should throw error if textarea element is missing', async () => {
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(`
            <html>
              <body>
                <div>No textarea here</div>
              </body>
            </html>
          `),
        } as Response),
      ) as unknown as typeof fetch;

      const url = 'https://www.pokewiki.de/Test_Set';

      // eslint-disable-next-line @typescript-eslint/await-thenable
      await expect(fetchWikitext(url)).rejects.toThrow(
        'Edit source page did not contain expected textarea element',
      );
    });

    it('should throw error if edit source is too short', async () => {
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(`
            <html>
              <body>
                <textarea id="wpTextbox1">Short</textarea>
              </body>
            </html>
          `),
        } as Response),
      ) as unknown as typeof fetch;

      const url = 'https://www.pokewiki.de/Test_Set';

      // eslint-disable-next-line @typescript-eslint/await-thenable
      await expect(fetchWikitext(url)).rejects.toThrow(
        'Edit source content is too short',
      );
    });

    it('should throw error if fetch fails', async () => {
      global.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          text: () => Promise.resolve(''),
        } as Response),
      ) as unknown as typeof fetch;

      const url = 'https://www.pokewiki.de/Test_Set';

      // eslint-disable-next-line @typescript-eslint/await-thenable
      await expect(fetchWikitext(url)).rejects.toThrow(
        'Failed to fetch edit source',
      );
    });
  });

  describe('extractSetInfoFromInfobox', () => {
    it('should extract set ID and name from Erweiterung Infobox template', async () => {
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(`
            <html>
              <body>
                <textarea id="wpTextbox1">{{Erweiterung Infobox|Name=Mega-Aufstieg|kürzel=B1|other=value}}
{{Setzeile|1|Bisasam|SomeField|C Pocket|}}
=== Mega-Garados-Booster ===
{{Setrate/Zeile|1|}}
${'x'.repeat(5000)}
                </textarea>
              </body>
            </html>
          `),
        } as Response),
      ) as unknown as typeof fetch;

      const url = 'https://www.pokewiki.de/Test_Set';
      const parsedSet = await parseSet(url);

      expect(parsedSet.setId).toBe('B1');
      expect(parsedSet.name).toBe('Mega-Aufstieg');
    });

    it('should handle multiline infobox template', async () => {
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(`
            <html>
              <body>
                <textarea id="wpTextbox1">{{Erweiterung Infobox
|Name=Test Set Name
|kürzel=A5
|other=value}}
{{Setzeile|1|Bisasam|SomeField|C Pocket|}}
=== Mega-Garados-Booster ===
{{Setrate/Zeile|1|}}
${'x'.repeat(5000)}
                </textarea>
              </body>
            </html>
          `),
        } as Response),
      ) as unknown as typeof fetch;

      const url = 'https://www.pokewiki.de/Test_Set';
      const parsedSet = await parseSet(url);

      expect(parsedSet.setId).toBe('A5');
      expect(parsedSet.name).toBe('Test Set Name');
    });

    it('should fallback to URL extraction if infobox not found', async () => {
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(`
            <html>
              <body>
                <textarea id="wpTextbox1">{{Setzeile|1|Bisasam|SomeField|C Pocket|}}
=== Mega-Garados-Booster ===
{{Setrate/Zeile|1|}}
${'x'.repeat(5000)}
                </textarea>
              </body>
            </html>
          `),
        } as Response),
      ) as unknown as typeof fetch;

      const url = 'https://www.pokewiki.de/Mega-Aufstieg_(TCG_Pocket)';
      const parsedSet = await parseSet(url);

      // Should extract from URL or use fallback
      expect(parsedSet.setId).toBe('NEW_SET');
      expect(parsedSet.name).toBeTruthy();
    });
  });

  describe('parseSet integration', () => {
    it('should parse a complete set with cards and boosters', async () => {
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(`
            <html>
              <body>
                <textarea id="wpTextbox1">{{Erweiterung Infobox|Name=Test Set|kürzel=T1}}
{{Setzeile|1|Bisasam|SomeField|C Pocket|}}
{{Setzeile|2|Bisaknosp|SomeField|U Pocket|}}
=== Mega-Garados-Booster ===
{{Setrate/Zeile|1|}}
{{Setrate/Zeile|2|}}
=== Mega-Lohgock-Booster ===
{{Setrate/Zeile|1|}}
${'x'.repeat(5000)}
                </textarea>
              </body>
            </html>
          `),
        } as Response),
      ) as unknown as typeof fetch;

      const url = 'https://www.pokewiki.de/Test_Set';
      const parsedSet = await parseSet(url);

      expect(parsedSet.setId).toBe('T1');
      expect(parsedSet.name).toBe('Test Set');
      expect(parsedSet.boosters).toEqual(['Mega-Garados', 'Mega-Lohgock']);
      expect(parsedSet.cards).toHaveLength(2);
      expect(parsedSet.cards[0]).toMatchObject({
        number: 1,
        name: 'Bisasam',
        rarity: '♢',
      });
      expect(parsedSet.cards[0].boosters).toContain('Mega-Garados');
      expect(parsedSet.cards[0].boosters).toContain('Mega-Lohgock');
      expect(parsedSet.cards[1]).toMatchObject({
        number: 2,
        name: 'Bisaknosp',
        rarity: '♢♢',
      });
      expect(parsedSet.cards[1].boosters).toContain('Mega-Garados');
    });

    it('should correctly map all Pokewiki rarities to project symbols', async () => {
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(`
            <html>
              <body>
                <textarea id="wpTextbox1">{{Erweiterung Infobox|Name=Rarity Test|kürzel=RT1}}
{{Setzeile|1|Card1|Type|C Pocket|}}
{{Setzeile|2|Card2|Type|U Pocket|}}
{{Setzeile|3|Card3|Type|R Pocket|}}
{{Setzeile|4|Card4|Type|RR Pocket|}}
{{Setzeile|5|Card5|Type|SA Pocket|}}
{{Setzeile|6|Card6|Type|SSASR Pocket|}}
{{Setzeile|7|Card7|Type|Immersion|}}
{{Setzeile|8|Card8|Type|S Pocket|}}
{{Setzeile|9|Card9|Type|SSR Pocket|}}
{{Setzeile|10|Card10|Type|UR Pocket|}}
=== Test-Booster ===
{{Setrate/Zeile|1|}}
{{Setrate/Zeile|2|}}
{{Setrate/Zeile|3|}}
{{Setrate/Zeile|4|}}
{{Setrate/Zeile|5|}}
{{Setrate/Zeile|6|}}
{{Setrate/Zeile|7|}}
{{Setrate/Zeile|8|}}
{{Setrate/Zeile|9|}}
{{Setrate/Zeile|10|}}
${'x'.repeat(5000)}
                </textarea>
              </body>
            </html>
          `),
        } as Response),
      ) as unknown as typeof fetch;

      const url = 'https://www.pokewiki.de/Test_Set';
      const parsedSet = await parseSet(url);

      expect(parsedSet.cards).toHaveLength(10);
      expect(parsedSet.cards[0]?.rarity).toBe('♢'); // C Pocket
      expect(parsedSet.cards[1]?.rarity).toBe('♢♢'); // U Pocket
      expect(parsedSet.cards[2]?.rarity).toBe('♢♢♢'); // R Pocket
      expect(parsedSet.cards[3]?.rarity).toBe('♢♢♢♢'); // RR Pocket
      expect(parsedSet.cards[4]?.rarity).toBe('☆'); // SA Pocket
      expect(parsedSet.cards[5]?.rarity).toBe('☆☆'); // SSASR Pocket
      expect(parsedSet.cards[6]?.rarity).toBe('☆☆☆'); // Immersion
      expect(parsedSet.cards[7]?.rarity).toBe('✸'); // S Pocket
      expect(parsedSet.cards[8]?.rarity).toBe('✸✸'); // SSR Pocket
      expect(parsedSet.cards[9]?.rarity).toBe('♛'); // UR Pocket
    });

    it('should handle promo sets without rarities', async () => {
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(`
            <html>
              <body>
                <textarea id="wpTextbox1">{{Erweiterung Infobox|Name=PROMO-Test|kürzel=PROMO-T}}
{{Setzeile|1|Pikachu|Elektro}}
{{Setzeile|2|Charizard|Feuer}}
${'x'.repeat(5000)}
                </textarea>
              </body>
            </html>
          `),
        } as Response),
      ) as unknown as typeof fetch;

      const url = 'https://www.pokewiki.de/PROMO-Test_(TCG_Pocket)';
      const parsedSet = await parseSet(url);

      expect(parsedSet.setId).toBe('PROMO-T');
      expect(parsedSet.name).toBe('PROMO-Test');
      expect(parsedSet.boosters).toBeNull(); // Promo sets should have null boosters
      expect(parsedSet.cards).toHaveLength(2);
      expect(parsedSet.cards[0]?.name).toBe('Pikachu');
      expect(parsedSet.cards[0]?.rarity).toBe(''); // No rarity for promo sets
      expect(parsedSet.cards[1]?.name).toBe('Charizard');
      expect(parsedSet.cards[1]?.rarity).toBe('');
    });

    it('should handle single-booster sets correctly', async () => {
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(`
            <html>
              <body>
                <textarea id="wpTextbox1">{{Erweiterung Infobox|Name=Single Booster|kürzel=A1a}}
{{Setzeile|1|Card1|Type|C Pocket|}}
{{Setzeile|2|Card2|Type|U Pocket|}}
${'x'.repeat(5000)}
                </textarea>
              </body>
            </html>
          `),
        } as Response),
      ) as unknown as typeof fetch;

      const url = 'https://www.pokewiki.de/Single_Booster_(TCG_Pocket)';
      const parsedSet = await parseSet(url);

      expect(parsedSet.setId).toBe('A1a');
      expect(parsedSet.name).toBe('Single Booster');
      expect(parsedSet.boosters).toEqual([]); // Empty array for single-booster sets
      expect(parsedSet.cards).toHaveLength(2);
    });
  });
});
