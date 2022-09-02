import {Octokit} from "octokit";
import {inject, singleton} from "tsyringe";
import {DateTimeSettingRepository} from "./Repositories/DateTimeSettingRepository";
import {Gpt3Service} from "./Gpt3Service";
import {TelegramService} from "./TelegramService";
import {Config} from "./Config";

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
        this.lastCommitDateTime = await this.dateTimeSettingRepository.get(LAST_COMMIT_DATE_TIME_SETTING, new Date(0));
        await this.pollAndAnnounceCommits();
        setInterval(async (): Promise<void> => {
            await this.pollAndAnnounceCommits();
        }, INTERVAL_MILLISECONDS);
    }

    private async pollAndAnnounceCommits(): Promise<void> {
        const commits = await this.octokit.rest.repos.listCommits({
            owner: 'netzhuffle',
            repo: 'parmelae-bot',
            since: this.lastCommitDateTime?.toISOString(),
        });
        commits.data.reverse();
        commits.data.forEach(this.handleCommit.bind(this));
    }

    private async handleCommit(commit: {
        commit: {
            committer: {
                date?: string,
            } | null,
            message: string,
        }
    }): Promise<void> {
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
            const promise = this.dateTimeSettingRepository.update(LAST_COMMIT_DATE_TIME_SETTING, this.lastCommitDateTime, date);
            this.lastCommitDateTime = date;
            await promise;
        }
    }
}
