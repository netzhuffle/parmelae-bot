#!/usr/bin/env bun

import * as cheerio from 'cheerio';
import assert from 'node:assert/strict';

// ---------------------------
// Configuration
// ---------------------------

/** Minimum expected length of wikitext content to consider it valid */
const MIN_WIKITEXT_LENGTH = 500;

/** Pokewiki base URL for validation */
const POKEWIKI_BASE_URL = 'https://www.pokewiki.de';

/**
 * Maps Pokewiki rarity codes to project rarity symbols.
 *
 * @see RARITY_MAP in PokemonTcgPocketService.ts for symbol definitions
 */
const RARITY_MAP: Record<string, string> = {
  'C Pocket': '♢',
  'U Pocket': '♢♢',
  'R Pocket': '♢♢♢',
  'RR Pocket': '♢♢♢♢',
  'SA Pocket': '☆',
  'SSASR Pocket': '☆☆',
  Immersion: '☆☆☆',
  'S Pocket': '✸',
  'SSR Pocket': '✸✸',
  'UR Pocket': '♛',
} as const;

/**
 * Regex pattern for matching Setzeile templates.
 * Captures all fields, then we'll extract number, name, and find rarity (last field that matches known rarities)
 * Format: {{Setzeile|number|name|...|rarity}}
 * Handles variable number of fields (type, link, etc. may be present)
 */
const SETZEILE_REGEX = /\{\{Setzeile\|([^}]+)\}\}/g;

/**
 * Regex pattern for matching booster section headers.
 * Format: === BoosterName-Booster ===
 * Note: Booster names can contain hyphens (e.g., "Mega-Garados"),
 * so we match everything up to "-Booster" rather than stopping at the first hyphen.
 */
const BOOSTER_HEADER_REGEX = /=== (.+?)-Booster ===/g;

/**
 * Regex pattern for matching Setrate/Zeile templates within booster sections.
 * Captures: card number
 */
const SETRATE_ZEILE_REGEX = /\{\{Setrate\/Zeile\|(\d+)\|/g;

/**
 * Regex pattern for extracting set name from Setname template.
 * Format: {{Setname|Set Name}}
 */
const SETNAME_REGEX = /\{\{Setname\|([^}]+)\}\}/;

/**
 * Regex pattern for extracting set name from page title (level 1 heading).
 * Format: = Set Name =
 */
const PAGE_TITLE_REGEX = /^=\s*([^=]+?)\s*=/m;

// ---------------------------
// Types
// ---------------------------

export interface CardEntry {
  number: number;
  name: string;
  rarity: string;
  boosters: string[];
}

export interface ParsedSet {
  setId: string;
  name: string;
  boosters: string[] | null; // null for promo sets, empty array for single-booster sets
  cards: CardEntry[];
}

// ---------------------------
// Helpers
// ---------------------------

/**
 * Validates that a URL is a valid Pokewiki URL.
 *
 * @param url - The URL to validate
 * @throws {Error} If the URL is not a valid Pokewiki URL
 */
function validatePokewikiUrl(url: string): void {
  try {
    const urlObj = new URL(url);
    if (urlObj.origin !== POKEWIKI_BASE_URL) {
      throw new Error(
        `URL must be from ${POKEWIKI_BASE_URL}, got: ${urlObj.origin}`,
      );
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Invalid URL format: ${url}`);
    }
    throw error;
  }
}

/**
 * Converts a Pokewiki page URL to its edit source URL.
 *
 * @param url - The Pokewiki page URL
 * @returns The edit source URL
 */
function buildEditUrl(url: string): string {
  const urlObj = new URL(url);
  // Extract page name from path (remove leading slash)
  const pageName = urlObj.pathname.slice(1);
  return `${POKEWIKI_BASE_URL}/index.php?title=${encodeURIComponent(pageName)}&action=edit`;
}

/**
 * Fetches the edit source wikitext from a Pokewiki page.
 *
 * @param url - The Pokewiki page URL
 * @returns The raw wikitext content
 * @throws {Error} If the URL is invalid, edit source cannot be fetched, or content is invalid
 */
export async function fetchWikitext(url: string): Promise<string> {
  validatePokewikiUrl(url);
  const editUrl = buildEditUrl(url);

  const response = await fetch(editUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch edit source: ${response.status} ${response.statusText}`,
    );
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const textarea = $('#wpTextbox1').val();

  if (typeof textarea !== 'string') {
    throw new Error(
      'Edit source page did not contain expected textarea element (#wpTextbox1).',
    );
  }

  if (textarea.length < MIN_WIKITEXT_LENGTH) {
    throw new Error(
      `Edit source content is too short (${textarea.length} characters, expected at least ${MIN_WIKITEXT_LENGTH}).`,
    );
  }

  return textarea;
}

/**
 * Extract all matches of a regex into an array of capture groups.
 *
 * @param text - The text to search
 * @param regex - The regex pattern to match (must have global flag)
 * @returns Array of capture group arrays
 */
export function matchAll(text: string, regex: RegExp): string[][] {
  const out: string[][] = [];
  let match: RegExpExecArray | null;

  // Reset regex lastIndex to ensure we start from the beginning
  regex.lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    out.push(match.slice(1));
  }

  return out;
}

/**
 * Extracts booster header names from the wikitext source.
 *
 * @param source - The wikitext source
 * @returns Array of booster names found in the source
 */
function extractBoosterHeaders(source: string): string[] {
  const boosterHeaders: string[] = [];
  let headerMatch: RegExpExecArray | null;

  BOOSTER_HEADER_REGEX.lastIndex = 0;
  while ((headerMatch = BOOSTER_HEADER_REGEX.exec(source)) !== null) {
    const headerName = headerMatch[1];
    if (headerName) {
      boosterHeaders.push(headerName.trim());
    }
  }

  return boosterHeaders;
}

/**
 * Extracts the content block for a specific booster section.
 * Finds everything between the booster header and the next booster header (or end of source).
 *
 * @param source - The wikitext source
 * @param booster - The booster name to extract
 * @param allBoosters - All booster names (for finding the next header)
 * @returns The booster block content, or null if not found
 */
function extractBoosterBlock(
  source: string,
  booster: string,
  allBoosters: string[],
): string | null {
  const boosterHeaderPattern = `=== ${booster}-Booster ===`;
  const otherBoosters = allBoosters.filter((b) => b !== booster);

  // Escape special regex characters in header pattern
  const escapedHeader = boosterHeaderPattern.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  );

  let boosterBlockRegex: RegExp;
  if (otherBoosters.length > 0) {
    // Multiple boosters: match until next booster header
    const nextBoosterPattern = otherBoosters
      .map((b) => `=== ${b}-Booster ===`)
      .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');
    boosterBlockRegex = new RegExp(
      `${escapedHeader}([\\s\\S]*?)(?=${nextBoosterPattern}|$)`,
    );
  } else {
    // Single booster: match until end of source
    boosterBlockRegex = new RegExp(`${escapedHeader}([\\s\\S]*?)$`);
  }

  const boosterMatch = boosterBlockRegex.exec(source);
  return boosterMatch?.[1] ?? null;
}

/**
 * Assigns booster associations to cards based on Setrate/Zeile entries.
 *
 * @param source - The wikitext source
 * @param cards - The cards dictionary to update
 * @param boosterHeaders - All booster names found in the source
 */
function assignBoostersToCards(
  source: string,
  cards: Record<number, CardEntry>,
  boosterHeaders: string[],
): void {
  for (const booster of boosterHeaders) {
    const boosterBlock = extractBoosterBlock(source, booster, boosterHeaders);
    if (!boosterBlock) {
      throw new Error(`Booster section missing: ${booster}`);
    }

    // Find all Setrate/Zeile entries in this booster block
    const boosterEntries = matchAll(boosterBlock, SETRATE_ZEILE_REGEX);

    for (const [numStr] of boosterEntries) {
      const cardNumber = parseInt(numStr, 10);
      const card = cards[cardNumber];
      if (card) {
        card.boosters.push(booster);
      }
    }
  }
}

/**
 * Extracts the set name from the wikitext source.
 * Tries multiple patterns in order:
 * 1. Setname template ({{Setname|...}})
 * 2. Page title (level 1 heading: = Title =)
 * 3. First section heading, skipping common section names
 *
 * @param source - The wikitext source
 * @returns The extracted set name, or 'Unknown Set' if not found
 */
function extractSetName(source: string): string {
  // Try Setname template first
  const setNameMatch = SETNAME_REGEX.exec(source);
  if (setNameMatch) {
    const nameValue = setNameMatch[1];
    if (nameValue) {
      return nameValue.trim();
    }
  }

  // Try page title (level 1 heading, usually at the start)
  const pageTitleMatch = PAGE_TITLE_REGEX.exec(source);
  if (pageTitleMatch) {
    const titleValue = pageTitleMatch[1];
    if (titleValue) {
      const trimmed = titleValue.trim();
      // Remove common suffixes like "(TCG Pocket)" if present
      const cleaned = trimmed.replace(/\s*\(TCG\s+Pocket\)\s*$/i, '').trim();
      return cleaned || trimmed;
    }
  }

  // Fall back to first section heading, skipping common section names
  const skipHeadings = [
    'Kartenliste',
    'Erscheinungsraten',
    'Boosterpacks',
    'In anderen Sprachen',
    'Inhaltsverzeichnis',
  ];
  const allHeadings = source.matchAll(/^==\s*([^=]+?)\s*==/gm);

  for (const headingMatch of allHeadings) {
    const heading = headingMatch[1]?.trim();
    if (heading && !skipHeadings.includes(heading)) {
      return heading;
    }
  }

  return 'Unknown Set';
}

/**
 * Escapes special YAML characters in a string.
 *
 * @param str - The string to escape
 * @returns The escaped string
 */
export function escapeYamlString(str: string): string {
  // If string contains special characters, wrap in quotes
  // eslint-disable-next-line no-useless-escape
  if (/[:#@`|>\]\[{}&*!?%'"]/.test(str) || str.includes('\n')) {
    // Escape quotes and backslashes
    return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return str;
}

/**
 * Formats parsed set data as YAML matching the project structure.
 *
 * @param setId - The set ID (e.g., "A1", "B1")
 * @param setName - The set name
 * @param boosters - Array of booster names
 * @param cards - Array of card entries
 * @returns The formatted YAML string
 */
export function formatYaml(
  setId: string,
  setName: string,
  boosters: string[] | null,
  cards: CardEntry[],
): string {
  const lines: string[] = [`${setId}:`];

  // Set name
  lines.push(`  name: ${escapeYamlString(setName)}`);

  // Boosters handling:
  // - null: promo set (boosters: ~)
  // - empty array: single-booster set (no boosters field)
  // - array with 1+ items: multi-booster set (boosters: [list])
  if (boosters === null) {
    // Promo set
    lines.push('  boosters: ~');
  } else if (boosters.length > 1) {
    // Multi-booster set
    lines.push('  boosters:');
    for (const booster of boosters) {
      lines.push(`    - ${escapeYamlString(booster)}`);
    }
  }
  // Single-booster set: omit boosters field entirely

  // Cards
  lines.push('  cards:');
  for (const card of cards) {
    lines.push(`    ${card.number}:`);
    lines.push(`      name: ${escapeYamlString(card.name)}`);
    // Only include rarity if it's not empty (promo sets may omit rarity)
    if (card.rarity) {
      lines.push(`      rarity: ${card.rarity}`);
    }

    // Card boosters (only if set has multiple boosters)
    // For single-booster sets and promo sets, omit boosters field entirely
    if (boosters !== null && boosters.length > 1) {
      if (card.boosters.length === 1) {
        const booster = card.boosters[0];
        if (booster) {
          lines.push(`      boosters: ${escapeYamlString(booster)}`);
        }
      } else if (card.boosters.length > 1) {
        lines.push('      boosters:');
        for (const booster of card.boosters) {
          lines.push(`        - ${escapeYamlString(booster)}`);
        }
      }
    }
  }

  return lines.join('\n');
}

// ---------------------------
// Main Parsing
// ---------------------------

/**
 * Extracts set information from Erweiterung Infobox template.
 * Template format: {{Erweiterung Infobox|Name=Set Name|kürzel=B1|...}}
 * Can span multiple lines. Searches directly in source for the key-value pairs.
 *
 * @param source - The wikitext source
 * @returns Object with setId and setName, or null if not found
 */
function extractSetInfoFromInfobox(source: string): {
  setId: string;
  setName: string;
} | null {
  // Check if Erweiterung Infobox exists in the source
  if (!source.includes('{{Erweiterung Infobox')) {
    return null;
  }

  // Extract Name field - match |Name=value (value can contain spaces, no |, }, or newline)
  const nameRegex = /\|Name=([^\n|}]+)/;
  const nameMatch = nameRegex.exec(source);

  // Extract kürzel field - match |kürzel=value (value can contain spaces, no |, }, or newline)
  const kuerzelRegex = /\|kürzel=([^\n|}]+)/;
  const kuerzelMatch = kuerzelRegex.exec(source);

  if (nameMatch && kuerzelMatch) {
    const setName = nameMatch[1]?.trim();
    const setId = kuerzelMatch[1]?.trim();

    if (setName && setId) {
      return { setId, setName };
    }
  }

  return null;
}

/**
 * Extracts set ID and name from the wikitext source using multiple strategies.
 * Priority order:
 * 1. Erweiterung Infobox template (Name and kürzel fields)
 * 2. Page content extraction (Setname template, page title, section headings)
 * 3. URL-based extraction (as final fallback)
 *
 * @param source - The wikitext source
 * @param url - The Pokewiki page URL (for fallback extraction)
 * @returns Object with setId and setName
 */
function extractSetInfo(
  source: string,
  url: string,
): {
  setId: string;
  setName: string;
} {
  // Try to extract from Erweiterung Infobox template first
  const infoboxInfo = extractSetInfoFromInfobox(source);
  if (infoboxInfo) {
    return infoboxInfo;
  }

  // Fallback: try to extract set name from page content
  let setName = extractSetName(source);
  if (setName === 'Unknown Set') {
    const urlSetName = extractSetNameFromUrl(url);
    if (urlSetName) {
      setName = urlSetName;
    }
  }

  return {
    setId: 'NEW_SET',
    setName,
  };
}

/**
 * Extracts set name from URL as a fallback.
 * Pokewiki URLs follow pattern: /SetName_(TCG_Pocket)
 *
 * @param url - The Pokewiki page URL
 * @returns The extracted set name, or null if not found
 */
function extractSetNameFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    // Extract the part before _(TCG_Pocket) or similar
    const urlRegex = /^\/(.+?)(?:_\(TCG[^)]*\))?$/;
    const match = urlRegex.exec(pathname);
    if (match) {
      const namePart = match[1];
      if (namePart) {
        // Replace underscores with spaces and decode URL encoding
        return decodeURIComponent(namePart.replace(/_/g, ' '));
      }
    }
  } catch {
    // Invalid URL, ignore
  }
  return null;
}

/**
 * Parses a Pokewiki set page and extracts card data.
 *
 * @param url - The Pokewiki page URL
 * @returns Parsed set data
 * @throws {Error} If parsing fails or validation errors occur
 */
export async function parseSet(url: string): Promise<ParsedSet> {
  const source = await fetchWikitext(url);

  // ---------------------------
  // 1. Extract set information (ID and name) - needed early to detect promo sets
  // ---------------------------
  const { setId, setName } = extractSetInfo(source, url);
  // Detect promo sets by set ID pattern OR URL pattern (PROMO-*)
  const isPromoSet = setId.startsWith('PROMO-') || url.includes('PROMO-');

  // ---------------------------
  // 2. Parse card list (Setzeile)
  // ---------------------------
  const setLines = matchAll(source, SETZEILE_REGEX);

  assert(setLines.length > 0, 'No Setzeile entries found.');

  const cards: Record<number, CardEntry> = {};

  for (const match of setLines) {
    // match[0] contains all fields separated by |
    const allFields = match[0].split('|');

    // First field is card number
    const numStr = allFields[0];
    const number = parseInt(numStr, 10);

    // Second field is card name
    const name = allFields[1]?.trim() ?? '';

    // Find rarity: it's the last field that matches a known rarity
    // Rarities end with "Pocket" or are "Immersion"
    // For promo sets, rarity may be omitted
    let rarity: string | undefined;
    for (let i = allFields.length - 1; i >= 2; i--) {
      const field = allFields[i]?.trim();
      if (field && RARITY_MAP[field] !== undefined) {
        rarity = field;
        break;
      }
    }

    // For promo sets, rarity is optional
    if (!isPromoSet) {
      assert(
        rarity !== undefined,
        `Could not find rarity in Setzeile: ${match[0]}`,
      );
    }

    const mappedRarity = rarity ? RARITY_MAP[rarity] : undefined;
    if (!isPromoSet) {
      assert(
        mappedRarity !== undefined,
        `Rarity mapping failed for: ${rarity}`,
      );
    }

    const cardEntry: CardEntry = {
      number,
      name: name.trim(),
      rarity: mappedRarity ?? '', // Empty string for promo sets without rarity
      boosters: [],
    };
    cards[number] = cardEntry;
  }

  // ---------------------------
  // 3. Parse booster tables (optional - may not exist for single-booster or promo sets)
  // ---------------------------
  const boosterHeaders = extractBoosterHeaders(source);
  let boosters: string[] | null = null;

  if (boosterHeaders.length > 0) {
    // Multi-booster set: assign boosters to cards
    assignBoostersToCards(source, cards, boosterHeaders);

    // Verify every card has at least 1 booster
    for (const card of Object.values(cards)) {
      assert(card.boosters.length >= 1, `Card ${card.number} has no booster.`);
    }

    boosters = boosterHeaders;
  } else if (isPromoSet) {
    // Promo set: no boosters (null)
    boosters = null;
  } else {
    // Single-booster set: empty array (no boosters field in YAML)
    boosters = [];
  }

  // Sort cards by number
  const sortedCards = Object.values(cards).sort((a, b) => a.number - b.number);

  return {
    setId,
    name: setName,
    boosters,
    cards: sortedCards,
  };
}

// ---------------------------
// CLI Interface
// ---------------------------

/**
 * Main execution function.
 */
async function main(): Promise<void> {
  const url = Bun.argv[2];

  if (!url) {
    console.error('Usage: bun scripts/pokewiki-scraper.ts <URL>');
    console.error(
      'Example: bun scripts/pokewiki-scraper.ts https://www.pokewiki.de/Mega-Aufstieg_(TCG_Pocket)',
    );
    process.exit(1);
  }

  try {
    const parsedSet = await parseSet(url);
    const yaml = formatYaml(
      parsedSet.setId,
      parsedSet.name,
      parsedSet.boosters,
      parsedSet.cards,
    );
    console.log(yaml);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('ERROR:', errorMessage);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${Bun.argv[1]}`) {
  void main();
}
