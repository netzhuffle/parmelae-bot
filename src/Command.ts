/**
 * Commands recognized by the bot.
 */
export const enum Command {
    /** Informs the user about the capabilities of the bot. */
    Info,
    /** Replies to the message the user replied to. */
    Comment,
    /** Completes a text message. */
    Complete,
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