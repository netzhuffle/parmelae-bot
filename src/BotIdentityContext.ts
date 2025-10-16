import assert from 'node:assert/strict';

/**
 * Explicit bot identity context for multi-bot operations.
 *
 * Ensures all bot-related operations have clear identity context,
 * preventing ambiguity about which bot is being referenced.
 */
export interface BotIdentityContext {
  /**
   * Bot's Telegram username (without @).
   * Must be non-empty string for bot users.
   * Comparison is case-insensitive as per Telegram standards.
   */
  readonly username: string;
}

/**
 * Normalizes a Telegram username for case-insensitive comparison.
 *
 * Telegram usernames are case-insensitive, so this helper ensures
 * consistent comparison across different environments and inputs.
 *
 * @param username - The username to normalize
 * @returns Trimmed and lowercase username
 */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

/**
 * Validates BotIdentityContext and throws if invalid.
 *
 * Uses normalized username comparison to ensure robustness
 * across different input formats.
 *
 * @param context - The bot identity context to validate
 * @throws {AssertionError} When username is empty or invalid
 */
export function validateBotIdentityContext(context: BotIdentityContext): void {
  const normalized = normalizeUsername(context.username);
  assert(
    normalized.length > 0,
    'BotIdentityContext.username must be non-empty',
  );
}
