import {Octokit} from "octokit";
import {inject, singleton} from "tsyringe";
import {DateTimeSettingRepository} from "./Repositories/DateTimeSettingRepository";
import {Gpt3Service} from "./Gpt3Service";
import {TelegramService} from "./TelegramService";
import {Config} from "./Config";
import {RequestError} from "@octokit/request-error";

type Commit = {
    commit: {
        committer: {
            date?: string,
        } | null,
        message: string,
    }
};

const LAST_COMMIT_DATE_TIME_SETTING = 'last commit DateTime';
const INTERVAL_MILLISECONDS = 180_000;

/** Announces new commits on GitHub */
@singleton()
export class GitHubService {
    private lastCommitDateTime: Date | null = null;

    constructor(
        private readonly octokit: Octokit,
        private readonly dateTimeSettingRepository: DateTimeSettingRepository,
        private readonly gpt3Service: Gpt3Service,
        private readonly telegramService: TelegramService,
        @inject('Config') private readonly config: Config,
    ) {
    }

    /** Fetches commits now and periodically and announces new commits. */
    async startPollingAndAnnounceCommits(): Promise<void> {
        this.lastCommitDateTime = await this.dateTimeSettingRepository.get(LAST_COMMIT_DATE_TIME_SETTING, new Date());
        await this.pollAndAnnounceCommits();
        setInterval(async (): Promise<void> => {
            await this.pollAndAnnounceCommits();
        }, INTERVAL_MILLISECONDS);
    }

    private async pollAndAnnounceCommits(): Promise<void> {
        const commits = await this.pollCommits();
        commits.reverse();
        for (const commit of commits) {
            await this.handleCommit(commit);
        }
    }

    private async pollCommits(): Promise<Commit[]> {
        let commitsList: { data: Commit[] };
        try {
            commitsList = await this.octokit.rest.repos.listCommits({
                owner: 'netzhuffle',
                repo: 'parmelae-bot',
                since: this.lastCommitDateTime?.toISOString(),
            });
        } catch (e) {
            if (e instanceof RequestError) {
                // Avoid crash for HTTP request errors.
                console.error(e);
                return [];
            } else {
                // Rethrow otherwise.
                throw e;
            }
        }
        return commitsList.data;
    }

    private async handleCommit(commit: Commit): Promise<void> {
        const dateString = commit.commit.committer?.date;
        if (dateString) {
            const date = new Date(dateString);
            if (this.lastCommitDateTime && date <= this.lastCommitDateTime) {
                return;
            }
            await this.updateSettingIfNewer(date);
        }

        const commitMessage = commit.commit.message;
        const announcementText = await this.gpt3Service.announceNewCommit(commitMessage);
        let promises: Promise<void>[] = [];
        this.config.newCommitAnnouncementChats.forEach(chat => {
            promises.push(this.telegramService.send(announcementText, chat));
        });
        await Promise.all(promises);
    }

    private async updateSettingIfNewer(date: Date): Promise<void> {
        if (this.lastCommitDateTime && date > this.lastCommitDateTime) {
            this.lastCommitDateTime = date;
            await this.dateTimeSettingRepository.update(LAST_COMMIT_DATE_TIME_SETTING, date);
        }
    }
}
