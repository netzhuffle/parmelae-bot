import * as dotenv from "dotenv";
import assert from "assert";
import { injectable } from "inversify";

/** The configuration options, taken from .env */
@injectable()
export class Config {
    /**
     * Whether to use GPT-4 or ChatGPT for LangChain agent and tools.
     * 
     * true = GPT-4
     * false = ChatGPT
     */
    public useGpt4 = false;

    /** The bot's Telegram username (without @). */
    public readonly username: string;

    /** The Telegram API auth token. */
    public readonly telegramToken: string;

    /** The OpenAI API auth key. */
    public readonly openAiKey: string;

    /** The Sentry DSN (optional). */
    public readonly sentryDsn: string | null;

    /** The GitHub Personal Access Token. */
    public readonly gitHubPersonalAccessToken: string;

    /** The Pinecone API key. */
    public readonly pineconeApiKey: string;

    /** The Pinecone environment. */
    public readonly pineconeEnvironment: string;

    /** The Pinecone index. */
    public readonly pineconeIndex: string;

    /** The SerpAPI API key. */
    public readonly serpApiApiKey: string;

    /**
     * The allowlisted chats for GPT queries.
     *
     * Can be private chats, groups, supergroups, or channels.
     */
    public readonly chatAllowlist: readonly number[];

    /**
     * New Git commits are announced in these chats.
     *
     * Can be private chats, groups, supergroups, or channels.
     */
    public readonly newCommitAnnouncementChats: readonly number[];

    constructor() {
        dotenv.config();

        assert(process.env.USERNAME, 'You must define USERNAME in .env');
        this.username = process.env.USERNAME;

        assert(process.env.TELEGRAM_TOKEN, 'You must define TELEGRAM_TOKEN in .env');
        this.telegramToken = process.env.TELEGRAM_TOKEN;

        assert(process.env.OPENAI_API_KEY, 'You must define OPENAI_API_KEY in .env');
        this.openAiKey = process.env.OPENAI_API_KEY;

        this.sentryDsn = process.env.SENTRY_DSN ?? null;

        assert(process.env.GITHUB_PERSONAL_ACCESS_TOKEN, 'You must define GIT_HUB_PERSONAL_ACCESS_TOKEN in.env');
        this.gitHubPersonalAccessToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

        assert(process.env.PINECONE_API_KEY, 'You must define PINECONE_API_KEY in .env');
        this.pineconeApiKey = process.env.PINECONE_API_KEY;
        assert(process.env.PINECONE_ENVIRONMENT, 'You must define PINECONE_ENVIRONMENT in.env');
        this.pineconeEnvironment = process.env.PINECONE_ENVIRONMENT;
        assert(process.env.PINECONE_INDEX, 'You must define PINECONE_INDEX in.env');
        this.pineconeIndex = process.env.PINECONE_INDEX;

        assert(process.env.SERPAPI_API_KEY, 'You must define SERPAPI_API_KEY in.env');
        this.serpApiApiKey = process.env.SERPAPI_API_KEY;

        assert(process.env.CHAT_ALLOWLIST, 'You must define CHAT_ALLOWLIST in .env');
        this.chatAllowlist = process.env.CHAT_ALLOWLIST.split(",").map(Number);
        this.chatAllowlist.forEach(
            chat => assert(!isNaN(chat), 'CHAT_ALLOWLIST must contain only numbers'),
        );

        assert(process.env.NEW_COMMITS_ANNOUNCEMENT_CHATS, 'You must define NEW_COMMIT_ANNOUNCEMENT_CHATS in .env');
        this.newCommitAnnouncementChats = process.env.NEW_COMMITS_ANNOUNCEMENT_CHATS.split(",").map(Number);
        this.newCommitAnnouncementChats.forEach(
            chat => assert(!isNaN(chat), 'NEW_COMMIT_ANNOUNCEMENT_CHATS must contain only numbers'),
        );
    }
}
