/**
 * Type-only module: All exports are TypeScript interfaces that are erased at runtime.
 * Always use `import type` when importing from this module to avoid runtime import errors.
 *
 * @example
 * ```typescript
 * import type { BotConfig } from './ConfigInterfaces.js';
 * ```
 */

/**
 * Configuration for a single bot instance.
 */
export interface BotConfiguration {
  readonly username: string;
  readonly telegramToken: string;
  readonly defaultIdentity: string | null; // Identity name from env, null if not set
}

/**
 * Narrow interface for bot configuration needs.
 * Used by services that only need bot-related configuration.
 */
export interface BotConfig {
  readonly primaryBot: BotConfiguration;
  readonly bots: readonly BotConfiguration[];
  getBotByUsername(username: string): BotConfiguration | undefined;
}

/**
 * Narrow interface for GitHub service configuration needs.
 */
export interface GitHubConfig {
  readonly newCommitAnnouncementChats: readonly bigint[];
}
