export interface Config {
    readonly username: string;
    readonly telegramToken: string;
    readonly witToken: string;
    readonly openAiKey: string;
    readonly chatAllowlist: readonly number[];
    readonly senderAllowlist: readonly number[];
    readonly newCommitAnnouncementChats: readonly number[];
}
