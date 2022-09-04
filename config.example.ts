export default {
    /** The bot's Telegram username (without @). */
    username: 'the bots name without @',

    /** The Telegram API auth token. */
    telegramToken: 'get from @BotFather',

    /** The Wit API auth token. */
    witToken: 'get from wit.ai',

    /** The OpenAI API auth key. */
    openAiKey: 'get from open_ai.com',

    /** The Sentry DSN (optional). */
    sentryDsn: null,

    /**
     * The allowlisted chats for GPT-3 queries.
     *
     * Can be private chats, groups, supergroups, or channels.
     */
    chatAllowlist: [12345, 67890],

    /**
     * New Git commits are announced in these chats.
     *
     * Can be private chats, groups, supergroups, or channels.
     */
    newCommitAnnouncementChats: [12345],
} as const;
