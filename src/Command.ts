/**
 * Commands recognized by the bot.
 */
export const Commands = {
    /** Informs the user about the capabilities of the bot. */
    Info: 'info',
    /** Replies to the message the user replied to. */
    Comment: 'comment',
    /** Generates an image corresponding to the query. */
    Image: 'image',
    /** Starts the minecraft server. */
    StartMinecraft: 'startminecraft',
    /** Stops the minecraft server. */
    StopMinecraft: 'stopminecraft',
    /** Backups the minecraft server. */
    BackupMinecraft: 'backupminecraft',
    /** Tells the current running status of the minecraft server. */
    StatusMinecraft: 'statusminecraft',
    /** Tells the user that the command is unknown. */
    Unknown: 'unknown',
} as const;

/**
 * Commands recognized by the bot.
 */
export type Command = typeof Commands[keyof typeof Commands];
