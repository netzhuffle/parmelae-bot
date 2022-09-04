export interface Config {
    /** The bot's Telegram username (without @). */
    readonly username: string;

    /** The Telegram API auth token. */
    readonly telegramToken: string;

    /** The Wit API auth token. */
    readonly witToken: string;

    /** The OpenAI API auth key. */
    readonly openAiKey: string;

    /** The Sentry DSN (optional). */
    readonly sentryDsn: string | null;

    /**
     * The allowlisted chats for GPT-3 queries.
     *
     * Can be private chats, groups, supergroups, or channels.
     */
    readonly chatAllowlist: readonly number[];

    /**
     * New Git commits are announced in these chats.
     *
     * Can be private chats, groups, supergroups, or channels.
     */
    readonly newCommitAnnouncementChats: readonly number[];
}
