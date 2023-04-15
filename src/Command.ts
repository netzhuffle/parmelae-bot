/**
 * Commands recognized by the bot.
 */
export const Commands = {
  /** Informs the user about the capabilities of the bot. */
  Info: 'info',
  /** Replies to the message the user replied to. */
  Comment: 'comment',
  /** Tells the user that the command is unknown. */
  Unknown: 'unknown',
} as const;

/**
 * Commands recognized by the bot.
 */
export type Command = (typeof Commands)[keyof typeof Commands];
