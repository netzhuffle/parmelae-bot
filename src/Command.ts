/**
 * Commands recognized by the bot.
 */
export const enum Command {
    /** Informs the user about the capabilities of the bot. */
    Info,
    /** Replies to the message the user replied to. */
    Comment,
    /** Generates an image corresponding to the query. */
    Image,
    /** Starts the minecraft server. */
    StartMinecraft,
    /** Stops the minecraft server. */
    StopMinecraft,
    /** Backups the minecraft server. */
    BackupMinecraft,
    /** Tells the current running status of the minecraft server. */
    StatusMinecraft,
    /** Tells the user that the command is unknown. */
    Unknown,
}
